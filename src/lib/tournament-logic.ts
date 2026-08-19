/**
 * Tournament business logic: standings recalculation, match finalization,
 * innings total sync, and statistics computation.
 *
 * These are client-side equivalents of the server-side tournament.ts queries.
 * They write directly to Firestore using batched writes / transactions.
 */

import {
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  tournamentDoc,
  teamsCol,
  teamDoc,
  matchesCol,
  matchDoc,
  inningsCol,
  inningsDoc,
  battingScoresCol,
  bowlingScoresCol,
  standingsCol,
  standingDoc,
  playersCol,
  TOURNAMENT_ID,
  type Tournament,
  type Team,
  type Match,
  type Innings,
  type BattingScore,
  type BowlingScore,
  type Player,
  type HydratedMatch,
  now,
} from "./firestore";
import { db } from "./firebase";
import {
  computeNrr,
  effectiveNrrBalls,
  determineOutcome,
} from "./cricket";

// ---------------------------------------------------------------------------
// Standings recalculation (from scratch, idempotent)
// ---------------------------------------------------------------------------

export async function recalculateStandings() {
  const [tournamentSnap, teamsSnap, matchesSnap] = await Promise.all([
    getDoc(tournamentDoc()),
    getDocs(query(teamsCol(), where("tournamentId", "==", TOURNAMENT_ID))),
    getDocs(query(matchesCol(), where("tournamentId", "==", TOURNAMENT_ID))),
  ]);

  let tournament: Tournament;
  if (!tournamentSnap.exists()) {
    const defaultData = {
      name: "WASA Premier League",
      shortName: "WPL",
      winPoints: 2,
      tiePoints: 1,
      noResultPoints: 1,
      lossPoints: 0,
      oversPerSide: 10,
      championTeamId: null,
      createdAt: now(),
      updatedAt: now(),
    };
    await setDoc(tournamentDoc(), defaultData);
    tournament = { id: TOURNAMENT_ID, ...defaultData };
  } else {
    tournament = { id: tournamentSnap.id, ...tournamentSnap.data() } as Tournament;
  }
  const quotaBalls = tournament.oversPerSide * 6;

  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
  const allMatches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
  const leagueMatches = allMatches.filter((m) => m.stage === "LEAGUE");

  const completedIds = leagueMatches
    .filter((m) => m.status === "COMPLETED")
    .map((m) => m.id);
  const noResultIds = leagueMatches
    .filter((m) => m.status === "NO_RESULT" || m.status === "ABANDONED")
    .map((m) => m.id);

  const allInnings = completedIds.length
    ? (await getDocs(query(inningsCol(), where("matchId", "in", completedIds)))).docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Innings,
      )
    : [];

  // Preserve admin tiebreak values
  const existingStandingsSnap = await getDocs(standingsCol());
  const tiebreakByTeam = new Map(
    existingStandingsSnap.docs.map((d) => {
      const s = d.data() as { adminTiebreak?: number };
      return [d.id, s.adminTiebreak ?? 0];
    }),
  );

  type Agg = {
    played: number; won: number; lost: number; tied: number; noResult: number;
    points: number; runsFor: number; ballsFor: number;
    runsAgainst: number; ballsAgainst: number;
  };
  const agg = new Map<string, Agg>();
  for (const t of teams) {
    agg.set(t.id, {
      played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0,
      runsFor: 0, ballsFor: 0, runsAgainst: 0, ballsAgainst: 0,
    });
  }

  // No-result matches
  for (const m of leagueMatches.filter((x) => noResultIds.includes(x.id))) {
    for (const teamId of [m.teamAId, m.teamBId]) {
      if (!teamId) continue;
      const a = agg.get(teamId);
      if (!a) continue;
      a.played += 1;
      a.noResult += 1;
      a.points += tournament.noResultPoints;
    }
  }

  // Completed matches
  for (const m of leagueMatches.filter((x) => completedIds.includes(x.id))) {
    if (!m.teamAId || !m.teamBId) continue;
    const matchInnings = allInnings.filter((i) => i.matchId === m.id);
    const inn1 = matchInnings.find((i) => i.inningsNumber === 1);
    const inn2 = matchInnings.find((i) => i.inningsNumber === 2);
    if (!inn1) continue;

    const aA = agg.get(m.teamAId)!;
    const aB = agg.get(m.teamBId)!;
    aA.played += 1;
    aB.played += 1;

    const outcome = determineOutcome({
      innings1Runs: inn1.runs,
      innings1Balls: inn1.balls,
      innings1AllOut: inn1.allOut,
      innings1Wickets: inn1.wickets,
      innings2Runs: inn2?.runs ?? null,
      innings2Balls: inn2?.balls ?? null,
      innings2AllOut: inn2?.allOut ?? false,
      innings2Wickets: inn2?.wickets ?? null,
    });

    const winnerTeamId =
      outcome.kind === "WIN"
        ? outcome.winner === "TEAM_A"
          ? inn1.battingTeamId
          : inn1.bowlingTeamId
        : null;

    if (outcome.kind === "TIE") {
      aA.tied += 1; aB.tied += 1;
      aA.points += tournament.tiePoints;
      aB.points += tournament.tiePoints;
    } else if (outcome.kind === "NO_RESULT") {
      aA.noResult += 1; aB.noResult += 1;
      aA.points += tournament.noResultPoints;
      aB.points += tournament.noResultPoints;
    } else if (winnerTeamId === m.teamAId) {
      aA.won += 1; aB.lost += 1;
      aA.points += tournament.winPoints;
      aB.points += tournament.lossPoints;
    } else if (winnerTeamId === m.teamBId) {
      aB.won += 1; aA.lost += 1;
      aB.points += tournament.winPoints;
      aA.points += tournament.lossPoints;
    }

    for (const inn of [inn1, inn2]) {
      if (!inn) continue;
      const batting = agg.get(inn.battingTeamId);
      const bowling = agg.get(inn.bowlingTeamId);
      if (!batting || !bowling) continue;
      const effBalls = effectiveNrrBalls(inn.balls, inn.allOut, quotaBalls);
      batting.runsFor += inn.runs;
      batting.ballsFor += effBalls;
      bowling.runsAgainst += inn.runs;
      bowling.ballsAgainst += effBalls;
    }
  }

  const rows = teams.map((t) => {
    const a = agg.get(t.id)!;
    return {
      teamId: t.id,
      teamName: t.name,
      ...a,
      nrr: computeNrr(a),
      adminTiebreak: tiebreakByTeam.get(t.id) ?? 0,
    };
  });

  rows.sort(
    (x, y) =>
      y.points - x.points ||
      y.nrr - x.nrr ||
      y.adminTiebreak - x.adminTiebreak ||
      x.teamName.localeCompare(y.teamName),
  );

  const batch = writeBatch(db);
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    batch.set(standingDoc(r.teamId), {
      tournamentId: TOURNAMENT_ID,
      teamId: r.teamId,
      played: r.played,
      won: r.won,
      lost: r.lost,
      tied: r.tied,
      noResult: r.noResult,
      points: r.points,
      runsFor: r.runsFor,
      ballsFor: r.ballsFor,
      runsAgainst: r.runsAgainst,
      ballsAgainst: r.ballsAgainst,
      nrr: r.nrr,
      position: i + 1,
      qualified: i < 2 && r.played > 0,
      adminTiebreak: r.adminTiebreak,
      updatedAt: now(),
    });
  }
  await batch.commit();

  await maybeGenerateFinalFixture(allMatches, rows);
  return rows;
}

// ---------------------------------------------------------------------------
// Auto-populate the Final fixture once league stage is complete
// ---------------------------------------------------------------------------

async function maybeGenerateFinalFixture(
  allMatches: Match[],
  sortedRows: { teamId: string }[],
) {
  const leagueMatches = allMatches.filter((m) => m.stage === "LEAGUE");
  if (leagueMatches.length === 0) return;
  const allDone = leagueMatches.every(
    (m) =>
      m.status === "COMPLETED" ||
      m.status === "NO_RESULT" ||
      m.status === "ABANDONED",
  );
  if (!allDone) return;
  if (sortedRows.length < 2) return;

  const finalMatch = allMatches.find((m) => m.stage === "FINAL");
  if (!finalMatch) return;
  if (finalMatch.status === "COMPLETED" || finalMatch.status === "LIVE") return;
  if (
    finalMatch.teamAId === sortedRows[0].teamId &&
    finalMatch.teamBId === sortedRows[1].teamId
  ) return;

  await updateDoc(matchDoc(finalMatch.id), {
    teamAId: sortedRows[0].teamId,
    teamBId: sortedRows[1].teamId,
    updatedAt: now(),
  });
}

// ---------------------------------------------------------------------------
// Innings totals sync
// ---------------------------------------------------------------------------

export async function syncInningsTotals(inningsId: string) {
  const snap = await getDoc(inningsDoc(inningsId));
  if (!snap.exists()) throw new Error("Innings not found");
  const inn = { id: snap.id, ...snap.data() } as Innings;

  const [battingSnap, bowlingSnap] = await Promise.all([
    getDocs(query(battingScoresCol(), where("inningsId", "==", inningsId))),
    getDocs(query(bowlingScoresCol(), where("inningsId", "==", inningsId))),
  ]);

  const batting = battingSnap.docs.map((d) => d.data() as BattingScore);
  const bowling = bowlingSnap.docs.map((d) => d.data() as BowlingScore);

  const batRuns = batting.reduce((s, b) => s + b.runs, 0);
  const extras =
    inn.wides + inn.noBalls + inn.byes + inn.legByes + inn.penaltyRuns;
  const runs = batRuns + extras;
  const wickets = batting.filter((b) => b.isOut).length;
  const balls = bowling.reduce((s, b) => s + b.balls, 0);
  const allOut = wickets >= 10;

  await updateDoc(inningsDoc(inningsId), { runs, wickets, balls, allOut, updatedAt: now() });
  return { runs, wickets, balls, allOut };
}

// ---------------------------------------------------------------------------
// Finalize match
// ---------------------------------------------------------------------------

export async function finalizeMatch(matchId: string) {
  const snap = await getDoc(matchDoc(matchId));
  if (!snap.exists()) throw new Error("Match not found");
  const match = { id: snap.id, ...snap.data() } as Match;

  const tournSnap = await getDoc(tournamentDoc());
  if (!tournSnap.exists()) {
    await setDoc(tournamentDoc(), {
      name: "WASA Premier League",
      shortName: "WPL",
      winPoints: 2,
      tiePoints: 1,
      noResultPoints: 1,
      lossPoints: 0,
      oversPerSide: 10,
      championTeamId: null,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  const inningsSnap = await getDocs(
    query(inningsCol(), where("matchId", "==", matchId)),
  );
  const matchInnings = inningsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings);
  const inn1 = matchInnings.find((i) => i.inningsNumber === 1);
  const inn2 = matchInnings.find((i) => i.inningsNumber === 2);

  let winningTeamId: string | null = null;
  let resultText = "Match ended without a result";
  let status: "COMPLETED" | "NO_RESULT" = "COMPLETED";

  if (!inn1) {
    status = "NO_RESULT";
    resultText = "No result";
  } else {
    const outcome = determineOutcome({
      innings1Runs: inn1.runs,
      innings1Balls: inn1.balls,
      innings1AllOut: inn1.allOut,
      innings1Wickets: inn1.wickets,
      innings2Runs: inn2?.runs ?? null,
      innings2Balls: inn2?.balls ?? null,
      innings2AllOut: inn2?.allOut ?? false,
      innings2Wickets: inn2?.wickets ?? null,
    });

    const battingFirstId = inn1.battingTeamId;
    const battingSecondId = inn1.bowlingTeamId;

    const [teamASnap, teamBSnap] = await Promise.all([
      getDoc(teamDoc(battingFirstId)),
      getDoc(teamDoc(battingSecondId)),
    ]);
    const nameOf = (id: string) =>
      (id === battingFirstId ? teamASnap : teamBSnap).data()?.name ?? "Team";

    if (outcome.kind === "TIE") {
      resultText = "Match tied";
    } else if (outcome.kind === "NO_RESULT") {
      status = "NO_RESULT";
      resultText = "No result";
    } else {
      const firstWon = outcome.winner === "TEAM_A";
      winningTeamId = firstWon ? battingFirstId : battingSecondId;
      resultText = `${nameOf(winningTeamId)} won by ${outcome.margin}`;
    }
  }

  await updateDoc(matchDoc(matchId), {
    status,
    winningTeamId,
    resultText,
    completedAt: now(),
    updatedAt: now(),
  });

  if (match.stage === "FINAL" && winningTeamId) {
    await updateDoc(tournamentDoc(), {
      championTeamId: winningTeamId,
      updatedAt: now(),
    });
  }

  await recalculateStandings();
  return { status, winningTeamId, resultText };
}

// ---------------------------------------------------------------------------
// Statistics helpers (used by queries.ts)
// ---------------------------------------------------------------------------

export async function getTournamentBattingStats(schedule: HydratedMatch[]) {
  const completed = schedule.filter((m) => m.status === "COMPLETED");
  if (completed.length === 0) return [];

  const matchIds = completed.map((m) => m.id);
  const inningsSnap = await getDocs(
    query(inningsCol(), where("matchId", "in", matchIds)),
  );
  const inningsList = inningsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings);
  const inningsIds = inningsList.map((i) => i.id);
  if (inningsIds.length === 0) return [];

  const [battingSnap, playersSnap, teamsSnap] = await Promise.all([
    getDocs(query(battingScoresCol(), where("inningsId", "in", inningsIds))),
    getDocs(playersCol()),
    getDocs(query(teamsCol(), where("tournamentId", "==", TOURNAMENT_ID))),
  ]);

  const scores = battingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BattingScore);
  const allPlayers = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
  const allTeams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);

  type Stat = {
    playerId: string; name: string; teamName: string; teamId: string;
    inningsCount: number; runs: number; balls: number; fours: number;
    sixes: number; outs: number; highest: number;
  };
  const map = new Map<string, Stat>();

  for (const s of scores) {
    const p = allPlayers.find((pl) => pl.id === s.playerId);
    if (!p) continue;
    const team = allTeams.find((t) => t.id === p.teamId);
    const cur = map.get(s.playerId) ?? {
      playerId: s.playerId, name: p.name,
      teamName: team?.name ?? "", teamId: p.teamId,
      inningsCount: 0, runs: 0, balls: 0, fours: 0, sixes: 0, outs: 0, highest: 0,
    };
    cur.inningsCount += 1;
    cur.runs += s.runs;
    cur.balls += s.balls;
    cur.fours += s.fours;
    cur.sixes += s.sixes;
    cur.outs += s.isOut ? 1 : 0;
    cur.highest = Math.max(cur.highest, s.runs);
    map.set(s.playerId, cur);
  }

  return [...map.values()]
    .map((p) => ({
      ...p,
      average: p.outs > 0 ? p.runs / p.outs : null,
      strikeRate: p.balls > 0 ? (p.runs / p.balls) * 100 : 0,
    }))
    .sort((a, b) => b.runs - a.runs);
}

export async function getTournamentBowlingStats(schedule: HydratedMatch[]) {
  const completed = schedule.filter((m) => m.status === "COMPLETED");
  if (completed.length === 0) return [];

  const matchIds = completed.map((m) => m.id);
  const inningsSnap = await getDocs(
    query(inningsCol(), where("matchId", "in", matchIds)),
  );
  const inningsList = inningsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings);
  const inningsIds = inningsList.map((i) => i.id);
  if (inningsIds.length === 0) return [];

  const [bowlingSnap, playersSnap, teamsSnap] = await Promise.all([
    getDocs(query(bowlingScoresCol(), where("inningsId", "in", inningsIds))),
    getDocs(playersCol()),
    getDocs(query(teamsCol(), where("tournamentId", "==", TOURNAMENT_ID))),
  ]);

  const scores = bowlingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BowlingScore);
  const allPlayers = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
  const allTeams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);

  type Stat = {
    playerId: string; name: string; teamName: string; teamId: string;
    inningsCount: number; balls: number; maidens: number; runs: number;
    wickets: number; bestWickets: number; bestRuns: number;
  };
  const map = new Map<string, Stat>();

  for (const s of scores) {
    const p = allPlayers.find((pl) => pl.id === s.playerId);
    if (!p) continue;
    const team = allTeams.find((t) => t.id === p.teamId);
    const cur = map.get(s.playerId) ?? {
      playerId: s.playerId, name: p.name,
      teamName: team?.name ?? "", teamId: p.teamId,
      inningsCount: 0, balls: 0, maidens: 0, runs: 0,
      wickets: 0, bestWickets: 0, bestRuns: 0,
    };
    cur.inningsCount += 1;
    cur.balls += s.balls;
    cur.maidens += s.maidens;
    cur.runs += s.runs;
    cur.wickets += s.wickets;
    if (
      s.wickets > cur.bestWickets ||
      (s.wickets === cur.bestWickets && (cur.wickets === 0 || s.runs < cur.bestRuns))
    ) {
      cur.bestWickets = s.wickets;
      cur.bestRuns = s.runs;
    }
    map.set(s.playerId, cur);
  }

  return [...map.values()]
    .map((p) => ({
      ...p,
      economy: p.balls > 0 ? (p.runs / p.balls) * 6 : 0,
      average: p.wickets > 0 ? p.runs / p.wickets : null,
      bestFigures: `${p.bestWickets}/${p.bestRuns}`,
    }))
    .sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
}

export async function getTournamentSummaryStats(schedule: HydratedMatch[]) {
  const completed = schedule.filter((m) => m.status === "COMPLETED");
  if (completed.length === 0) {
    return {
      totalMatches: schedule.length,
      completedMatches: 0,
      liveMatches: schedule.filter((m) => m.status === "LIVE").length,
      upcomingMatches: schedule.filter((m) => m.status === "UPCOMING").length,
      totalRuns: 0,
      totalWickets: 0,
      highestTeamScore: null,
      lowestTeamScore: null,
    };
  }

  const matchIds = completed.map((m) => m.id);
  const inningsSnap = await getDocs(
    query(inningsCol(), where("matchId", "in", matchIds)),
  );
  const inningsList = inningsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings);

  const totalRuns = inningsList.reduce((s, i) => s + i.runs, 0);
  const totalWickets = inningsList.reduce((s, i) => s + i.wickets, 0);
  const highestTeam = inningsList.reduce(
    (best, i) => (i.runs > (best?.runs ?? -1) ? i : best),
    null as null | Innings,
  );
  const lowestTeam = inningsList.reduce(
    (best, i) => (i.runs < (best?.runs ?? Infinity) ? i : best),
    null as null | Innings,
  );

  return {
    totalMatches: schedule.length,
    completedMatches: completed.length,
    liveMatches: schedule.filter((m) => m.status === "LIVE").length,
    upcomingMatches: schedule.filter((m) => m.status === "UPCOMING").length,
    totalRuns,
    totalWickets,
    highestTeamScore: highestTeam
      ? { runs: highestTeam.runs, wickets: highestTeam.wickets, teamId: highestTeam.battingTeamId }
      : null,
    lowestTeamScore: lowestTeam
      ? { runs: lowestTeam.runs, wickets: lowestTeam.wickets, teamId: lowestTeam.battingTeamId }
      : null,
  };
}
