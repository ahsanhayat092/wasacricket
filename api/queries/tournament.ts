import { getDb } from "./connection";
import {
  tournaments,
  teams,
  matches,
  innings,
  standings,
  battingScores,
  bowlingScores,
  players,
} from "@db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  computeNrr,
  determineOutcome,
  effectiveNrrBalls,
} from "../lib/cricket";

const DEFAULT_TOURNAMENT_NAME = "T10 Cricket Championship";

/** Return the single tournament row, creating it if none exists. */
export async function getOrCreateTournament() {
  const db = getDb();
  const existing = await db.select().from(tournaments).limit(1);
  if (existing.length > 0) return existing[0];
  const [{ id }] = await db
    .insert(tournaments)
    .values({ name: DEFAULT_TOURNAMENT_NAME })
    .$returningId();
  const [created] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, id));
  return created;
}

export async function getTournament() {
  const db = getDb();
  const existing = await db.select().from(tournaments).limit(1);
  return existing[0] ?? null;
}

/**
 * Recalculate team match result + standings + final fixture, fully from
 * scratch. Idempotent: correcting a match and re-running never double counts.
 */
export async function recalculateStandings(tournamentId: number) {
  const db = getDb();
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, tournamentId),
  });
  if (!tournament) throw new Error("Tournament not found");
  const quotaBalls = tournament.oversPerSide * 6;

  const tournamentTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId));

  const leagueMatches = await db
    .select()
    .from(matches)
    .where(
      and(eq(matches.tournamentId, tournamentId), eq(matches.stage, "LEAGUE")),
    );

  const completedIds = leagueMatches
    .filter((m) => m.status === "COMPLETED")
    .map((m) => m.id);
  const noResultIds = leagueMatches
    .filter((m) => m.status === "NO_RESULT" || m.status === "ABANDONED")
    .map((m) => m.id);

  const allInnings = completedIds.length
    ? await db.select().from(innings).where(inArray(innings.matchId, completedIds))
    : [];

  // Preserve admin tiebreak values across recomputation
  const existing = await db
    .select()
    .from(standings)
    .where(eq(standings.tournamentId, tournamentId));
  const tiebreakByTeam = new Map(existing.map((s) => [s.teamId, s.adminTiebreak]));

  type Agg = {
    played: number; won: number; lost: number; tied: number; noResult: number;
    points: number; runsFor: number; ballsFor: number;
    runsAgainst: number; ballsAgainst: number;
  };
  const agg = new Map<number, Agg>();
  for (const t of tournamentTeams) {
    agg.set(t.id, {
      played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0,
      runsFor: 0, ballsFor: 0, runsAgainst: 0, ballsAgainst: 0,
    });
  }

  // No-result matches contribute NR points but no NRR figures
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

    // innings1: whoever batted first
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

    // outcome.winner is in innings order: TEAM_A = batted first
    const winnerTeamId =
      outcome.kind === "WIN"
        ? (outcome.winner === "TEAM_A" ? inn1.battingTeamId : inn1.bowlingTeamId)
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

    // NRR aggregates: each side's batting + bowling figures.
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

  const rows = tournamentTeams.map((t) => {
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

  const allLeagueMatchesCompleted =
    leagueMatches.length > 0 &&
    leagueMatches.every(
      (m) =>
        m.status === "COMPLETED" ||
        m.status === "NO_RESULT" ||
        m.status === "ABANDONED",
    );

  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await tx
        .insert(standings)
        .values({
          tournamentId,
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
          qualified: allLeagueMatchesCompleted && i < 2,
          adminTiebreak: r.adminTiebreak,
        })
        .onDuplicateKeyUpdate({
          set: {
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
            qualified: allLeagueMatchesCompleted && i < 2,
            adminTiebreak: r.adminTiebreak,
          },
        });
    }
  });

  await maybeGenerateFinalFixture(tournamentId);
  return rows;
}

/**
 * Once every league match is finished (COMPLETED / NO_RESULT / ABANDONED),
 * populate the Final fixture with Rank 1 vs Rank 2. Never overwrites a
 * completed or live final, so the admin can still modify it beforehand.
 */
export async function maybeGenerateFinalFixture(tournamentId: number) {
  const db = getDb();
  const leagueMatches = await db
    .select()
    .from(matches)
    .where(
      and(eq(matches.tournamentId, tournamentId), eq(matches.stage, "LEAGUE")),
    );
  if (leagueMatches.length === 0) return;
  const allDone = leagueMatches.every(
    (m) =>
      m.status === "COMPLETED" ||
      m.status === "NO_RESULT" ||
      m.status === "ABANDONED",
  );
  if (!allDone) return;

  const topTwo = await db
    .select()
    .from(standings)
    .where(eq(standings.tournamentId, tournamentId))
    .orderBy(asc(standings.position))
    .limit(2);
  if (topTwo.length < 2) return;

  const [final] = await db
    .select()
    .from(matches)
    .where(
      and(eq(matches.tournamentId, tournamentId), eq(matches.stage, "FINAL")),
    )
    .limit(1);
  if (!final) return;
  if (final.status === "COMPLETED" || final.status === "LIVE") return;
  if (final.teamAId === topTwo[0].teamId && final.teamBId === topTwo[1].teamId)
    return;

  await db
    .update(matches)
    .set({ teamAId: topTwo[0].teamId, teamBId: topTwo[1].teamId })
    .where(eq(matches.id, final.id));
}

/**
 * Finalize a completed match: set winner + result text from innings data,
 * then recalculate standings. For the FINAL stage, record the champion.
 */
export async function finalizeMatch(matchId: number) {
  const db = getDb();
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) throw new Error("Match not found");
  const tournament = await db.query.tournaments.findFirst({
    where: eq(tournaments.id, match.tournamentId),
  });
  if (!tournament) throw new Error("Tournament not found");

  const matchInnings = await db
    .select()
    .from(innings)
    .where(eq(innings.matchId, matchId));
  const inn1 = matchInnings.find((i) => i.inningsNumber === 1);
  const inn2 = matchInnings.find((i) => i.inningsNumber === 2);

  let winningTeamId: number | null = null;
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
    const teamRows = await db
      .select()
      .from(teams)
      .where(inArray(teams.id, [battingFirstId, battingSecondId]));
    const nameOf = (id: number) =>
      teamRows.find((t) => t.id === id)?.name ?? "Team";

    if (outcome.kind === "TIE") {
      resultText = "Match tied";
    } else if (outcome.kind === "NO_RESULT") {
      status = "NO_RESULT";
      resultText = "No result";
    } else {
      const firstWon = outcome.winner === "TEAM_A";
      // outcome.winner refers to innings order: TEAM_A = batted first
      winningTeamId = firstWon ? battingFirstId : battingSecondId;
      resultText = `${nameOf(winningTeamId)} won by ${outcome.margin}`;
    }
  }

  await db
    .update(matches)
    .set({ status, winningTeamId, resultText, completedAt: new Date() })
    .where(eq(matches.id, matchId));

  if (match.stage === "FINAL" && winningTeamId) {
    await db
      .update(tournaments)
      .set({ championTeamId: winningTeamId })
      .where(eq(tournaments.id, match.tournamentId));
  }

  await recalculateStandings(match.tournamentId);
  return { status, winningTeamId, resultText };
}

/** Recompute innings totals from its scorecard entries + extras. */
export async function syncInningsTotals(inningsId: number) {
  const db = getDb();
  const inn = await db.query.innings.findFirst({
    where: eq(innings.id, inningsId),
  });
  if (!inn) throw new Error("Innings not found");

  const batting = await db
    .select()
    .from(battingScores)
    .where(eq(battingScores.inningsId, inningsId));
  const bowling = await db
    .select()
    .from(bowlingScores)
    .where(eq(bowlingScores.inningsId, inningsId));

  const batRuns = batting.reduce((s, b) => s + b.runs, 0);
  const extras = inn.wides + inn.noBalls + inn.byes + inn.legByes + inn.penaltyRuns;
  const runs = batRuns + extras;
  const wickets = batting.filter((b) => b.isOut).length;
  // Legal balls faced = balls faced off the bat... but wides/no-balls are not
  // legal deliveries, so the innings ball count is the bowlers' legal balls.
  const balls = bowling.reduce((s, b) => s + b.balls, 0);
  const allOut = wickets >= 10;

  await db
    .update(innings)
    .set({ runs, wickets, balls, allOut })
    .where(eq(innings.id, inningsId));
  return { runs, wickets, balls, allOut };
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export async function getTournamentBattingStats(tournamentId: number) {
  const db = getDb();
  const tMatches = await db
    .select()
    .from(matches)
    .where(
      and(eq(matches.tournamentId, tournamentId), eq(matches.status, "COMPLETED")),
    );
  const matchIds = tMatches.map((m) => m.id);
  if (matchIds.length === 0) return [];
  const tInnings = await db
    .select()
    .from(innings)
    .where(inArray(innings.matchId, matchIds));
  const inningsIds = tInnings.map((i) => i.id);
  if (inningsIds.length === 0) return [];
  const scores = await db
    .select()
    .from(battingScores)
    .where(inArray(battingScores.inningsId, inningsIds));
  const allPlayers = await db.select().from(players);
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId));

  const map = new Map<
    number,
    {
      playerId: number; name: string; teamName: string; teamId: number;
      inningsCount: number; runs: number; balls: number; fours: number;
      sixes: number; outs: number; highest: number;
    }
  >();
  for (const s of scores) {
    const p = allPlayers.find((pl) => pl.id === s.playerId);
    if (!p) continue;
    const team = allTeams.find((t) => t.id === p.teamId);
    const cur =
      map.get(s.playerId) ?? {
        playerId: s.playerId,
        name: p.name,
        teamName: team?.name ?? "",
        teamId: p.teamId,
        inningsCount: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        outs: 0,
        highest: 0,
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

export async function getTournamentBowlingStats(tournamentId: number) {
  const db = getDb();
  const tMatches = await db
    .select()
    .from(matches)
    .where(
      and(eq(matches.tournamentId, tournamentId), eq(matches.status, "COMPLETED")),
    );
  const matchIds = tMatches.map((m) => m.id);
  if (matchIds.length === 0) return [];
  const tInnings = await db
    .select()
    .from(innings)
    .where(inArray(innings.matchId, matchIds));
  const inningsIds = tInnings.map((i) => i.id);
  if (inningsIds.length === 0) return [];
  const scores = await db
    .select()
    .from(bowlingScores)
    .where(inArray(bowlingScores.inningsId, inningsIds));
  const allPlayers = await db.select().from(players);
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId));

  const map = new Map<
    number,
    {
      playerId: number; name: string; teamName: string; teamId: number;
      inningsCount: number; balls: number; maidens: number; runs: number;
      wickets: number; bestWickets: number; bestRuns: number;
    }
  >();
  for (const s of scores) {
    const p = allPlayers.find((pl) => pl.id === s.playerId);
    if (!p) continue;
    const team = allTeams.find((t) => t.id === p.teamId);
    const cur =
      map.get(s.playerId) ?? {
        playerId: s.playerId,
        name: p.name,
        teamName: team?.name ?? "",
        teamId: p.teamId,
        inningsCount: 0,
        balls: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        bestWickets: 0,
        bestRuns: 0,
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

export async function getTournamentSummaryStats(tournamentId: number) {
  const db = getDb();
  const tMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId));
  const completed = tMatches.filter((m) => m.status === "COMPLETED");
  const matchIds = completed.map((m) => m.id);
  const tInnings = matchIds.length
    ? await db.select().from(innings).where(inArray(innings.matchId, matchIds))
    : [];

  const totalRuns = tInnings.reduce((s, i) => s + i.runs, 0);
  const totalWickets = tInnings.reduce((s, i) => s + i.wickets, 0);
  const highestTeam = tInnings.reduce(
    (best, i) => (i.runs > (best?.runs ?? -1) ? i : best),
    null as null | (typeof tInnings)[number],
  );
  const lowestTeam = tInnings.reduce(
    (best, i) => (i.runs < (best?.runs ?? Infinity) ? i : best),
    null as null | (typeof tInnings)[number],
  );

  return {
    totalMatches: tMatches.length,
    completedMatches: completed.length,
    liveMatches: tMatches.filter((m) => m.status === "LIVE").length,
    upcomingMatches: tMatches.filter((m) => m.status === "UPCOMING").length,
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
