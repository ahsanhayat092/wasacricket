/**
 * Tournament business logic: standings recalculation, match finalization,
 * innings total sync, and statistics computation.
 *
 * These are client-side equivalents of the server-side tournament.ts queries.
 * They write directly to Firestore using batched writes / transactions.
 */

import {
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
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

export async function recalculateStandings(tournamentId: string = TOURNAMENT_ID) {
  const [tournamentSnap, teamsSnap, matchesSnap] = await Promise.all([
    getDoc(tournamentDoc(tournamentId)),
    getDocs(query(teamsCol(), where("tournamentId", "==", tournamentId))),
    getDocs(query(matchesCol(), where("tournamentId", "==", tournamentId))),
  ]);

  let tournament: Tournament;
  if (!tournamentSnap.exists()) {
    if (tournamentId === TOURNAMENT_ID || tournamentId === "main") {
      const defaultData = {
        name: "WASA Premier League",
        shortName: "WPL",
        winPoints: 2,
        tiePoints: 1,
        noResultPoints: 1,
        lossPoints: 0,
        oversPerSide: 4,
        championTeamId: null,
        createdAt: now(),
        updatedAt: now(),
      };
      await setDoc(tournamentDoc(tournamentId), defaultData);
      tournament = { id: tournamentId, ...defaultData };
    } else {
      return;
    }
  } else {
    tournament = { id: tournamentSnap.id, ...tournamentSnap.data() } as Tournament;
  }
  const quotaBalls = (tournament.oversPerSide || 4) * 6;

  let rawTeams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
  if (rawTeams.length === 0 && (tournamentId === TOURNAMENT_ID || tournamentId === "main")) {
    const allTeams = await getDocs(teamsCol());
    rawTeams = allTeams.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Team)
      .filter((t) => !t.tournamentId || t.tournamentId === "main" || t.tournamentId === TOURNAMENT_ID);
  }

  // Deduplicate teams by ID and clean name
  const seenTeamIds = new Set<string>();
  const seenTeamNames = new Set<string>();
  const teams: Team[] = [];
  for (const t of rawTeams) {
    const cleanName = (t.name || "").trim().toLowerCase();
    if (!seenTeamIds.has(t.id) && (!cleanName || !seenTeamNames.has(cleanName))) {
      seenTeamIds.add(t.id);
      if (cleanName) seenTeamNames.add(cleanName);
      teams.push(t);
    }
  }

  let allMatches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
  if (allMatches.length === 0 && (tournamentId === TOURNAMENT_ID || tournamentId === "main")) {
    const allM = await getDocs(matchesCol());
    allMatches = allM.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Match)
      .filter((m) => !m.tournamentId || m.tournamentId === "main" || m.tournamentId === TOURNAMENT_ID);
  }
  const leagueMatches = allMatches.filter((m) => m.stage === "LEAGUE");

  const completedMatches = allMatches.filter((m) => m.status === "COMPLETED");
  const completedIds = completedMatches.map((m) => m.id);
  const noResultMatches = leagueMatches.filter(
    (m) => m.status === "NO_RESULT" || m.status === "ABANDONED",
  );

  const allInnings = completedIds.length
    ? (await getDocs(query(inningsCol(), where("matchId", "in", completedIds)))).docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Innings,
      )
    : [];

  // Preserve admin tiebreak values
  const existingStandingsSnap = await getDocs(
    query(standingsCol(), where("tournamentId", "==", tournamentId)),
  );
  const tiebreakByTeam = new Map(
    existingStandingsSnap.docs.map((d) => {
      const s = d.data() as { teamId?: string; adminTiebreak?: number };
      return [s.teamId || d.id, s.adminTiebreak ?? 0];
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

  // No-result matches for league standings
  for (const m of noResultMatches) {
    for (const teamId of [m.teamAId, m.teamBId]) {
      if (!teamId) continue;
      const a = agg.get(teamId);
      if (!a) continue;
      a.played += 1;
      a.noResult += 1;
      a.points += tournament.noResultPoints;
    }
  }

  const resolveWinnerTeamName = async (
    winnerTeamId: string,
    matchObj: Match,
  ): Promise<string> => {
    let name = teams.find((t) => t.id === winnerTeamId)?.name;
    if (!name) {
      if (winnerTeamId === matchObj.teamAId && matchObj.teamAId) {
        name = teams.find((t) => t.id === matchObj.teamAId)?.name;
      } else if (winnerTeamId === matchObj.teamBId && matchObj.teamBId) {
        name = teams.find((t) => t.id === matchObj.teamBId)?.name;
      }
    }
    if (!name) {
      try {
        const directSnap = await getDoc(teamDoc(winnerTeamId));
        if (directSnap.exists() && directSnap.data()?.name) {
          name = directSnap.data().name;
        }
      } catch {}
    }
    return name || "Winning Team";
  };

  // Process all completed matches (update outcome text and points for league matches)
  for (const m of completedMatches) {
    if (!m.teamAId || !m.teamBId) continue;
    const matchInnings = allInnings.filter((i) => i.matchId === m.id);
    const inn1 = matchInnings.find((i) => i.inningsNumber === 1);
    const inn2 = matchInnings.find((i) => i.inningsNumber === 2);
    if (!inn1) continue;

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

    const battingFirstId = inn1.battingTeamId || m.teamAId;
    const battingSecondId =
      inn2?.battingTeamId ||
      inn1.bowlingTeamId ||
      (m.teamAId === battingFirstId ? m.teamBId : m.teamAId) ||
      m.teamBId;

    const winnerTeamId =
      outcome.kind === "WIN"
        ? outcome.winner === "TEAM_A"
          ? battingFirstId
          : battingSecondId
        : null;

    let expectedResultText: string | null = null;
    if (outcome.kind === "TIE") {
      expectedResultText = "Match tied";
    } else if (outcome.kind === "NO_RESULT") {
      expectedResultText = "No result";
    } else if (winnerTeamId) {
      const winnerName = await resolveWinnerTeamName(winnerTeamId, m);
      expectedResultText = `${winnerName} won by ${outcome.margin}`;
    }

    if (
      expectedResultText &&
      m.status === "COMPLETED" &&
      (m.resultText !== expectedResultText || m.winningTeamId !== winnerTeamId)
    ) {
      await updateDoc(matchDoc(m.id), {
        winningTeamId: winnerTeamId,
        resultText: expectedResultText,
        updatedAt: now(),
      });
    }

    // League match points & NRR aggregation (Playoff and Final do not affect league points table)
    if (m.stage === "LEAGUE" || (!m.stage && (m.matchNumber ?? 0) <= 9)) {
      const aA = agg.get(m.teamAId);
      const aB = agg.get(m.teamBId);
      if (aA && aB) {
        aA.played += 1;
        aB.played += 1;

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

  const allLeagueMatchesCompleted =
    leagueMatches.length > 0 &&
    leagueMatches.every(
      (m) =>
        m.status === "COMPLETED" ||
        m.status === "NO_RESULT" ||
        m.status === "ABANDONED",
    );

  const hasPlayoffMatch = allMatches.some(
    (m) =>
      m.stage === "PLAYOFF" ||
      m.stage === "playoff" ||
      m.stage?.toUpperCase() === "PLAYOFF",
  );

  const currentPointsMap = new Map<string, number>(rows.map((r) => [r.teamId, r.points]));
  const currentPositionsMap = new Map<string, number>(rows.map((r, idx) => [r.teamId, idx + 1]));
  const currentNrrMap = new Map<string, number>(rows.map((r) => [r.teamId, r.nrr]));

  const scenarioResults = calculateScenarioQualifications(
    teams,
    leagueMatches,
    currentPointsMap,
    allLeagueMatchesCompleted,
    currentPositionsMap,
    currentNrrMap,
    tournament.winPoints || 2,
    hasPlayoffMatch,
  );

  const batch = writeBatch(db);
  const activeDocIds = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const docId = tournamentId === TOURNAMENT_ID ? r.teamId : `${tournamentId}_${r.teamId}`;
    activeDocIds.add(docId);
    const standingRef = doc(standingsCol(), docId);
    const scenario = scenarioResults.get(r.teamId);

    const qualificationStatus = scenario?.qualificationStatus ?? "IN_CONTENTION";
    const isQualified =
      qualificationStatus === "QUALIFIED_FINAL" ||
      qualificationStatus === "QUALIFIED_PLAYOFF" ||
      qualificationStatus === "QUALIFIED_TOP3";

    batch.set(standingRef, {
      tournamentId,
      teamId: r.teamId,
      position: i + 1,
      played: r.played,
      won: r.won,
      lost: r.lost,
      tied: r.tied,
      noResult: r.noResult,
      runsFor: r.runsFor,
      ballsFor: r.ballsFor,
      runsAgainst: r.runsAgainst,
      ballsAgainst: r.ballsAgainst,
      netRunRate: r.nrr,
      nrr: r.nrr,
      points: r.points,
      adminTiebreak: r.adminTiebreak,
      qualified: isQualified,
      qualificationStatus,
      canReachTop3: scenario?.canReachTop3 ?? true,
      guaranteedTop3: scenario?.guaranteedTop3 ?? false,
      canReachRank1: scenario?.canReachRank1 ?? true,
      guaranteedRank1: scenario?.guaranteedRank1 ?? false,
      eliminated: scenario?.eliminated ?? false,
      updatedAt: now(),
    });
  }

  // Delete obsolete or duplicate standings documents for this tournament
  for (const docSnap of existingStandingsSnap.docs) {
    if (!activeDocIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
    }
  }

  await batch.commit();

  await maybeGeneratePlayoffAndFinalFixtures(allMatches, rows, tournament);
  return rows;
}

// ---------------------------------------------------------------------------
// Scenario-based Mathematical Qualification Engine (Enumerates all 2^K outcomes)
// ---------------------------------------------------------------------------

export interface TeamScenarioOutcome {
  teamId: string;
  canReachTop3: boolean;
  guaranteedTop3: boolean;
  canReachRank1: boolean;
  guaranteedRank1: boolean;
  eliminated: boolean;
  qualificationStatus:
    | "QUALIFIED_FINAL"
    | "QUALIFIED_PLAYOFF"
    | "QUALIFIED_TOP3"
    | "IN_CONTENTION"
    | "ELIMINATED";
}

export function calculateScenarioQualifications(
  teams: { id: string; name?: string }[],
  leagueMatches: Match[],
  currentPoints: Map<string, number>,
  allLeagueMatchesCompleted: boolean,
  currentPositions: Map<string, number>,
  currentNrrMap?: Map<string, number>,
  winPoints = 2,
  hasPlayoffMatch = true,
): Map<string, TeamScenarioOutcome> {
  const result = new Map<string, TeamScenarioOutcome>();
  const qualifyingCutoff = hasPlayoffMatch ? 3 : 2;

  if (allLeagueMatchesCompleted) {
    for (const t of teams) {
      const pos = currentPositions.get(t.id) ?? 99;
      if (!hasPlayoffMatch) {
        // Direct Top 2 to Grand Final
        if (pos === 1 || pos === 2) {
          result.set(t.id, {
            teamId: t.id,
            canReachTop3: true,
            guaranteedTop3: true,
            canReachRank1: pos === 1,
            guaranteedRank1: pos === 1,
            eliminated: false,
            qualificationStatus: "QUALIFIED_FINAL",
          });
        } else {
          result.set(t.id, {
            teamId: t.id,
            canReachTop3: false,
            guaranteedTop3: false,
            canReachRank1: false,
            guaranteedRank1: false,
            eliminated: true,
            qualificationStatus: "ELIMINATED",
          });
        }
      } else {
        // Rank 1 -> Final, Rank 2 & 3 -> Playoff
        if (pos === 1) {
          result.set(t.id, {
            teamId: t.id,
            canReachTop3: true,
            guaranteedTop3: true,
            canReachRank1: true,
            guaranteedRank1: true,
            eliminated: false,
            qualificationStatus: "QUALIFIED_FINAL",
          });
        } else if (pos === 2 || pos === 3) {
          result.set(t.id, {
            teamId: t.id,
            canReachTop3: true,
            guaranteedTop3: true,
            canReachRank1: false,
            guaranteedRank1: false,
            eliminated: false,
            qualificationStatus: "QUALIFIED_PLAYOFF",
          });
        } else {
          result.set(t.id, {
            teamId: t.id,
            canReachTop3: false,
            guaranteedTop3: false,
            canReachRank1: false,
            guaranteedRank1: false,
            eliminated: true,
            qualificationStatus: "ELIMINATED",
          });
        }
      }
    }
    return result;
  }

  // Find all remaining unplayed/live league matches between 2 valid teams
  const unplayed = leagueMatches.filter(
    (m) =>
      m.status !== "COMPLETED" &&
      m.status !== "NO_RESULT" &&
      m.status !== "ABANDONED" &&
      !!m.teamAId &&
      !!m.teamBId,
  );

  const teamIds = teams.map((t) => t.id);

  // Initialize tracking
  const teamTracker = new Map<
    string,
    {
      canReachTop3: boolean;
      guaranteedTop3: boolean;
      canReachRank1: boolean;
      guaranteedRank1: boolean;
    }
  >();

  for (const tid of teamIds) {
    teamTracker.set(tid, {
      canReachTop3: false,
      guaranteedTop3: true,
      canReachRank1: false,
      guaranteedRank1: true,
    });
  }

  const K = unplayed.length;

  if (K === 0) {
    for (const tid of teamIds) {
      const pos = currentPositions.get(tid) ?? 99;
      result.set(tid, {
        teamId: tid,
        canReachTop3: pos <= 3,
        guaranteedTop3: pos <= 3,
        canReachRank1: pos === 1,
        guaranteedRank1: pos === 1,
        eliminated: pos > 3,
        qualificationStatus:
          pos === 1 ? "QUALIFIED_FINAL" : pos <= 3 ? "QUALIFIED_PLAYOFF" : "ELIMINATED",
      });
    }
    return result;
  }

  // Pre-calculate head-to-head winners from completed league matches
  const headToHeadWinners = new Map<string, string>();
  for (const m of leagueMatches) {
    if (m.status === "COMPLETED" && m.winningTeamId && m.teamAId && m.teamBId) {
      const pairKey = [m.teamAId, m.teamBId].sort().join("_");
      headToHeadWinners.set(pairKey, m.winningTeamId);
    }
  }

  // Enumerate 2^K possible win/loss outcomes for the remaining matches
  const totalScenarios = Math.pow(2, Math.min(K, 10)); // Cap to 1024 scenarios if more

  for (let s = 0; s < totalScenarios; s++) {
    // Clone starting points
    const simPts = new Map<string, number>();
    for (const tid of teamIds) {
      simPts.set(tid, currentPoints.get(tid) ?? 0);
    }

    // Also track scenario simulated winners
    const simH2H = new Map<string, string>(headToHeadWinners);

    // Apply match outcomes for this scenario bitmask
    for (let j = 0; j < K && j < 10; j++) {
      const match = unplayed[j];
      const teamAWins = (s & (1 << j)) === 0;
      if (teamAWins && match.teamAId && match.teamBId) {
        simPts.set(match.teamAId, (simPts.get(match.teamAId) ?? 0) + winPoints);
        const pairKey = [match.teamAId, match.teamBId].sort().join("_");
        simH2H.set(pairKey, match.teamAId);
      } else if (match.teamAId && match.teamBId) {
        simPts.set(match.teamBId, (simPts.get(match.teamBId) ?? 0) + winPoints);
        const pairKey = [match.teamAId, match.teamBId].sort().join("_");
        simH2H.set(pairKey, match.teamBId);
      }
    }

    // Evaluate each team in this scenario
    for (const tid of teamIds) {
      const myPts = simPts.get(tid) ?? 0;
      let strictlyAbove = 0;
      let atLeastSame = 1; // self

      for (const oid of teamIds) {
        if (oid === tid) continue;
        const otherPts = simPts.get(oid) ?? 0;
        if (otherPts > myPts) {
          strictlyAbove++;
          atLeastSame++;
        } else if (otherPts === myPts) {
          const pairKey = [tid, oid].sort().join("_");
          const h2hWinner = simH2H.get(pairKey);
          if (h2hWinner === oid) {
            // Other team won head-to-head, strictly above my team
            strictlyAbove++;
            atLeastSame++;
          } else if (h2hWinner === tid) {
            // My team won head-to-head
          } else {
            const myNrr = currentNrrMap?.get(tid) ?? 0;
            const otherNrr = currentNrrMap?.get(oid) ?? 0;
            if (otherNrr > myNrr) {
              strictlyAbove++;
              atLeastSame++;
            } else {
              atLeastSame++;
            }
          }
        }
      }

      const tracker = teamTracker.get(tid)!;

      // Can reach qualifying cutoff if strictly fewer teams are ahead of my team
      if (strictlyAbove < qualifyingCutoff) {
        tracker.canReachTop3 = true;
      }
      // Guaranteed qualification if at most qualifyingCutoff teams are >= my team
      if (atLeastSame > qualifyingCutoff) {
        tracker.guaranteedTop3 = false;
      }

      // Can reach rank 1 if no team is ahead of my team
      if (strictlyAbove === 0) {
        tracker.canReachRank1 = true;
      }
      // Guaranteed rank 1 if strictly ahead of everyone
      if (atLeastSame > 1) {
        tracker.guaranteedRank1 = false;
      }
    }
  }

  // Compile final status for each team
  for (const tid of teamIds) {
    const t = teamTracker.get(tid)!;
    const eliminated = !t.canReachTop3;
    let qualificationStatus:
      | "QUALIFIED_FINAL"
      | "QUALIFIED_PLAYOFF"
      | "QUALIFIED_TOP3"
      | "IN_CONTENTION"
      | "ELIMINATED" = "IN_CONTENTION";

    if (eliminated) {
      qualificationStatus = "ELIMINATED";
    } else if (t.guaranteedRank1) {
      qualificationStatus = "QUALIFIED_FINAL";
    } else if (t.guaranteedTop3) {
      qualificationStatus = "QUALIFIED_TOP3";
    } else {
      qualificationStatus = "IN_CONTENTION";
    }

    result.set(tid, {
      teamId: tid,
      canReachTop3: t.canReachTop3,
      guaranteedTop3: t.guaranteedTop3,
      canReachRank1: t.canReachRank1,
      guaranteedRank1: t.guaranteedRank1,
      eliminated,
      qualificationStatus,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Universal Knockout Stage Synchronization Engine
// Strictly follows tournament.playoffFormat:
// 1. DIRECT_TOP2: Grand Final (Rank 1 vs Rank 2)
// 2. PAGE_PLAYOFF_TOP3: Playoff (Rank 2 vs Rank 3) -> Grand Final (Rank 1 vs Playoff Winner)
// 3. IPL_TOP4: Qualifier 1 (Rank 1 vs Rank 2), Eliminator (Rank 3 vs Rank 4), Qualifier 2 (Loser Q1 vs Winner Elim), Grand Final (Winner Q1 vs Winner Q2)
// 4. SEMI_FINALS: Semi 1 (Rank 1 vs Rank 4), Semi 2 (Rank 2 vs Rank 3), Grand Final (Winner SF1 vs Winner SF2)
// 5. NONE: Pure league, Rank 1 crowned champion directly upon league completion
// ---------------------------------------------------------------------------

export async function syncKnockoutFixtures(
  allMatches: Match[],
  sortedRows: { teamId: string }[],
  tournament?: Tournament,
) {
  if (!sortedRows || sortedRows.length < 2) return;
  const playoffFormat: PlayoffFormatType = tournament?.playoffFormat || "DIRECT_TOP2";

  const leagueMatches = allMatches.filter(
    (m) => !m.stage || m.stage.toUpperCase() === "LEAGUE"
  );

  const allLeagueDone =
    leagueMatches.length > 0 &&
    leagueMatches.every(
      (m) =>
        m.status === "COMPLETED" ||
        m.status === "NO_RESULT" ||
        m.status === "ABANDONED",
    );

  const lastLeagueMatch = leagueMatches[leagueMatches.length - 1];
  const tId = tournament?.id || lastLeagueMatch?.tournamentId || TOURNAMENT_ID;
  const venue = tournament?.venueName || lastLeagueMatch?.venue || "Askari XI, Lahore";
  const oversPerSide = Number(tournament?.oversPerSide || lastLeagueMatch?.oversPerSide) || 4;
  const maxOverPerBowler = Number(tournament?.maxOverPerBowler || lastLeagueMatch?.maxOverPerBowler) || (oversPerSide <= 5 ? 1 : Math.ceil(oversPerSide / 5));
  const playersPerTeam = Number(tournament?.playersPerTeam || lastLeagueMatch?.playersPerTeam) || 11;
  const maxWickets = Number(tournament?.maxWickets || lastLeagueMatch?.maxWickets) || (tournament?.allowLastManStanding ? playersPerTeam : Math.max(1, playersPerTeam - 1));
  const allowLastManStanding = tournament?.allowLastManStanding ?? lastLeagueMatch?.allowLastManStanding ?? false;

  // Case 5: Pure League format (NONE)
  if (playoffFormat === "NONE") {
    if (allLeagueDone && sortedRows[0]?.teamId) {
      if (tournament?.championTeamId !== sortedRows[0].teamId) {
        await updateDoc(tournamentDoc(tId), {
          championTeamId: sortedRows[0].teamId,
          updatedAt: now(),
        });
      }
    }
    return;
  }

  // Precondition: If league is not completed, enforce TBD on all unplayed knockout matches
  if (!allLeagueDone) {
    for (const m of allMatches) {
      if (m.stage && m.stage.toUpperCase() !== "LEAGUE" && m.status !== "COMPLETED" && m.status !== "LIVE") {
        if (m.teamAId !== null || m.teamBId !== null) {
          await updateDoc(matchDoc(m.id), {
            teamAId: null,
            teamBId: null,
            updatedAt: now(),
          });
        }
      }
    }
    return;
  }

  // Helper to find, update, or create a knockout fixture
  let nextMatchNumber = allMatches.reduce((max, m) => Math.max(max, m.matchNumber || 0), 0) + 1;

  async function ensureKnockoutFixture(
    stage: string,
    desiredTeamA: string | null,
    desiredTeamB: string | null,
    defaultDay = "SUNDAY",
    defaultTime = "Finals",
  ): Promise<Match> {
    const existing = allMatches.find((m) => m.stage?.toUpperCase() === stage.toUpperCase());
    if (existing) {
      if (existing.status !== "COMPLETED" && existing.status !== "LIVE") {
        const needsA = existing.teamAId !== (desiredTeamA ?? null);
        const needsB = existing.teamBId !== (desiredTeamB ?? null);
        const needsOvers = existing.oversPerSide !== oversPerSide;
        if (needsA || needsB || needsOvers) {
          await updateDoc(matchDoc(existing.id), {
            teamAId: desiredTeamA ?? null,
            teamBId: desiredTeamB ?? null,
            oversPerSide,
            maxOverPerBowler,
            "rules.oversPerSide": oversPerSide,
            "rules.maxOverPerBowler": maxOverPerBowler,
            updatedAt: now(),
          });
          existing.teamAId = desiredTeamA ?? null;
          existing.teamBId = desiredTeamB ?? null;
          existing.oversPerSide = oversPerSide;
        }
      }
      return existing;
    }

    // Match does not exist yet -> create it
    const createdMatchNum = nextMatchNumber++;
    const ref = await addDoc(matchesCol(), {
      tournamentId: tId,
      matchNumber: createdMatchNum,
      stage: stage.toUpperCase(),
      teamAId: desiredTeamA ?? null,
      teamBId: desiredTeamB ?? null,
      oversPerSide,
      maxOverPerBowler,
      playersPerTeam,
      maxWickets,
      allowLastManStanding,
      venue,
      day: lastLeagueMatch?.day || defaultDay,
      date: lastLeagueMatch?.date || new Date().toISOString().split("T")[0],
      time: defaultTime,
      status: "UPCOMING",
      tossWinnerId: null,
      tossDecision: null,
      winningTeamId: null,
      resultText: null,
      createdAt: now(),
      updatedAt: now(),
    });

    const newMatch = {
      id: ref.id,
      tournamentId: tId,
      matchNumber: createdMatchNum,
      stage: stage.toUpperCase(),
      teamAId: desiredTeamA ?? null,
      teamBId: desiredTeamB ?? null,
      status: "UPCOMING",
      oversPerSide,
    } as Match;
    allMatches.push(newMatch);
    return newMatch;
  }

  const rank1Id = sortedRows[0]?.teamId ?? null;
  const rank2Id = sortedRows[1]?.teamId ?? null;
  const rank3Id = sortedRows[2]?.teamId ?? null;
  const rank4Id = sortedRows[3]?.teamId ?? null;

  // Case 1: DIRECT_TOP2
  if (playoffFormat === "DIRECT_TOP2") {
    await ensureKnockoutFixture("FINAL", rank1Id, rank2Id, "SUNDAY", "8:00 PM");
    return;
  }

  // Case 2: PAGE_PLAYOFF_TOP3
  if (playoffFormat === "PAGE_PLAYOFF_TOP3") {
    const playoffMatch = await ensureKnockoutFixture("PLAYOFF", rank2Id, rank3Id, "SATURDAY", "6:00 PM");
    const playoffWinnerId = playoffMatch.status === "COMPLETED" && playoffMatch.winningTeamId ? playoffMatch.winningTeamId : null;
    await ensureKnockoutFixture("FINAL", rank1Id, playoffWinnerId, "SUNDAY", "8:00 PM");
    return;
  }

  // Case 3: IPL_TOP4 (Qualifier 1, Eliminator, Qualifier 2, Final)
  if (playoffFormat === "IPL_TOP4") {
    const q1 = await ensureKnockoutFixture("QUALIFIER_1", rank1Id, rank2Id, "FRIDAY", "8:00 PM");
    const elim = await ensureKnockoutFixture("ELIMINATOR", rank3Id, rank4Id, "SATURDAY", "4:00 PM");

    const q1WinnerId = q1.status === "COMPLETED" && q1.winningTeamId ? q1.winningTeamId : null;
    const q1LoserId = q1.status === "COMPLETED" && q1.winningTeamId
      ? (q1.winningTeamId === q1.teamAId ? q1.teamBId : q1.teamAId)
      : null;
    const elimWinnerId = elim.status === "COMPLETED" && elim.winningTeamId ? elim.winningTeamId : null;

    const q2 = await ensureKnockoutFixture("QUALIFIER_2", q1LoserId, elimWinnerId, "SATURDAY", "8:00 PM");
    const q2WinnerId = q2.status === "COMPLETED" && q2.winningTeamId ? q2.winningTeamId : null;

    await ensureKnockoutFixture("FINAL", q1WinnerId, q2WinnerId, "SUNDAY", "8:00 PM");
    return;
  }

  // Case 4: SEMI_FINALS (Semi 1: 1 vs 4, Semi 2: 2 vs 3, Final: Winner SF1 vs Winner SF2)
  if (playoffFormat === "SEMI_FINALS") {
    const sf1 = await ensureKnockoutFixture("SEMI_1", rank1Id, rank4Id, "SATURDAY", "4:00 PM");
    const sf2 = await ensureKnockoutFixture("SEMI_2", rank2Id, rank3Id, "SATURDAY", "8:00 PM");

    const sf1WinnerId = sf1.status === "COMPLETED" && sf1.winningTeamId ? sf1.winningTeamId : null;
    const sf2WinnerId = sf2.status === "COMPLETED" && sf2.winningTeamId ? sf2.winningTeamId : null;

    await ensureKnockoutFixture("FINAL", sf1WinnerId, sf2WinnerId, "SUNDAY", "8:00 PM");
    return;
  }
}

export const maybeGeneratePlayoffAndFinalFixtures = syncKnockoutFixtures;
export const maybeGenerateFinalFixture = syncKnockoutFixtures;

// ---------------------------------------------------------------------------
// Innings totals sync
// ---------------------------------------------------------------------------

export async function syncInningsTotals(inningsId: string) {
  const snap = await getDoc(inningsDoc(inningsId));
  if (!snap.exists()) throw new Error("Innings not found");
  const inn = { id: snap.id, ...snap.data() } as Innings;

  const [battingSnap, bowlingSnap, matchSnap] = await Promise.all([
    getDocs(query(battingScoresCol(), where("inningsId", "==", inningsId))),
    getDocs(query(bowlingScoresCol(), where("inningsId", "==", inningsId))),
    inn.matchId ? getDoc(matchDoc(inn.matchId)) : Promise.resolve(null),
  ]);

  const matchData = matchSnap && matchSnap.exists() ? (matchSnap.data() as Match) : null;
  const lineupCount = Math.max(
    matchData?.teamAPlayingVI?.length || 0,
    matchData?.teamBPlayingVI?.length || 0,
    battingSnap.size || 0,
  );
  const totalPlayersInTeam = lineupCount > 0 ? lineupCount : (Number(matchData?.playersPerTeam) || 11);
  const lmsEnabled = totalPlayersInTeam >= 10 ? false : (matchData?.allowLastManStanding ?? (totalPlayersInTeam <= 8));
  const maxWickets = Number(
    matchData?.maxWickets && matchData.maxWickets > 0 && matchData.maxWickets !== 6 && totalPlayersInTeam >= 10
      ? 10
      : matchData?.maxWickets && matchData.maxWickets > 0
        ? matchData.maxWickets
        : (lmsEnabled ? totalPlayersInTeam : Math.max(1, totalPlayersInTeam - 1))
  );

  const batting = battingSnap.docs.map((d) => d.data() as BattingScore);
  const bowling = bowlingSnap.docs.map((d) => d.data() as BowlingScore);

  const batRuns = batting.reduce((s, b) => s + b.runs, 0);
  const extras =
    inn.wides + inn.noBalls + inn.byes + inn.legByes + inn.penaltyRuns;
  const runs = batRuns + extras;
  const recordedOuts = batting.filter((b) => b.isOut).length;
  const wickets = Math.min(maxWickets, battingSnap.empty ? (inn.wickets ?? 0) : Math.max(inn.wickets ?? 0, recordedOuts));
  const balls = bowling.reduce((s, b) => s + b.balls, 0);
  const allOut = wickets >= maxWickets;

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
      oversPerSide: 4,
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

  // Synchronize latest database scorecard totals before calculating outcome
  const [inn1Totals, inn2Totals] = await Promise.all([
    inn1 ? syncInningsTotals(inn1.id) : Promise.resolve(null),
    inn2 ? syncInningsTotals(inn2.id) : Promise.resolve(null),
  ]);

  let winningTeamId: string | null = null;
  let resultText = "Match ended without a result";
  let status: "COMPLETED" | "NO_RESULT" = "COMPLETED";

  if (!inn1) {
    status = "NO_RESULT";
    resultText = "No result";
  } else {
    const inn1Runs = inn1Totals ? inn1Totals.runs : inn1.runs;
    const inn1Balls = inn1Totals ? inn1Totals.balls : inn1.balls;
    const inn1AllOut = inn1Totals ? inn1Totals.allOut : inn1.allOut;
    const inn1Wickets = inn1Totals ? inn1Totals.wickets : inn1.wickets;

    const inn2Runs = inn2Totals ? inn2Totals.runs : (inn2?.runs ?? null);
    const inn2Balls = inn2Totals ? inn2Totals.balls : (inn2?.balls ?? null);
    const inn2AllOut = inn2Totals ? inn2Totals.allOut : (inn2?.allOut ?? false);
    const inn2Wickets = inn2Totals ? inn2Totals.wickets : (inn2?.wickets ?? null);

    const outcome = determineOutcome({
      innings1Runs: inn1Runs,
      innings1Balls: inn1Balls,
      innings1AllOut: inn1AllOut,
      innings1Wickets: inn1Wickets,
      innings2Runs: inn2Runs,
      innings2Balls: inn2Balls,
      innings2AllOut: inn2AllOut,
      innings2Wickets: inn2Wickets,
    });

    const battingFirstId = inn1.battingTeamId || match.teamAId || "";
    const battingSecondId =
      inn2?.battingTeamId ||
      inn1.bowlingTeamId ||
      (match.teamAId === battingFirstId ? match.teamBId : match.teamAId) ||
      match.teamBId ||
      "";

    const [allTeamsSnap, team1Snap, team2Snap] = await Promise.all([
      getDocs(teamsCol()),
      battingFirstId ? getDoc(teamDoc(battingFirstId)).catch(() => null) : null,
      battingSecondId ? getDoc(teamDoc(battingSecondId)).catch(() => null) : null,
    ]);
    const allTeams = allTeamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);

    const nameOf = (id: string | null | undefined): string => {
      if (!id) return "Team";
      const fromAll = allTeams.find((t) => t.id === id)?.name;
      if (fromAll) return fromAll;
      if (id === battingFirstId && team1Snap?.exists() && team1Snap.data()?.name) {
        return team1Snap.data().name;
      }
      if (id === battingSecondId && team2Snap?.exists() && team2Snap.data()?.name) {
        return team2Snap.data().name;
      }
      if (id === match.teamAId) {
        const tA = allTeams.find((t) => t.id === match.teamAId)?.name;
        if (tA) return tA;
      }
      if (id === match.teamBId) {
        const tB = allTeams.find((t) => t.id === match.teamBId)?.name;
        if (tB) return tB;
      }
      return "Winning Team";
    };

    if (outcome.kind === "TIE") {
      resultText = "Match tied";
    } else if (outcome.kind === "NO_RESULT") {
      status = "NO_RESULT";
      resultText = "No result";
    } else {
      const firstWon = outcome.winner === "TEAM_A";
      winningTeamId = firstWon ? battingFirstId : battingSecondId;
      const winnerName = nameOf(winningTeamId);
      resultText = `${winnerName} won by ${outcome.margin}`;
    }
  }

  await updateDoc(matchDoc(matchId), {
    status,
    winningTeamId,
    resultText,
    completedAt: now(),
    updatedAt: now(),
  });

  const tId = match.tournamentId || TOURNAMENT_ID;

  if (match.stage === "FINAL" && winningTeamId) {
    await updateDoc(tournamentDoc(tId), {
      championTeamId: winningTeamId,
      updatedAt: now(),
    });
  }

  await recalculateStandings(tId);
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
    photoUrl?: string | null;
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
      photoUrl: p.photoUrl ?? null,
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
    photoUrl?: string | null;
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
      photoUrl: p.photoUrl ?? null,
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
