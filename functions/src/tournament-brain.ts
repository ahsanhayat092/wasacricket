import * as admin from "firebase-admin";
import type {
  Tournament,
  Match,
  Innings,
  Team,
} from "./types";

/**
 * Net Run Rate = (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
 * ICC Rule: If all out before full quota, the full quota of balls is used.
 */
export function runRate(runs: number, balls: number): number {
  if (balls <= 0) return 0;
  return (runs / balls) * 6;
}

export function effectiveNrrBalls(
  ballsFaced: number,
  allOut: boolean,
  quotaBalls: number,
): number {
  return allOut ? quotaBalls : ballsFaced;
}

export function computeNrr(
  runsFor: number,
  ballsFor: number,
  runsAgainst: number,
  ballsAgainst: number,
): number {
  const rrFor = runRate(runsFor, ballsFor);
  const rrAgainst = runRate(runsAgainst, ballsAgainst);
  return rrFor - rrAgainst;
}

export interface StandingsCalculationResult {
  teamId: string;
  groupName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  runsFor: number;
  ballsFor: number;
  runsAgainst: number;
  ballsAgainst: number;
  netRunRate: number;
  nrr?: number;
  position: number;
  status: "QUALIFIED_PLAYOFF" | "ELIMINATED" | "ACTIVE";
}

/**
 * Pure function: calculates standings for a given tournament, its teams, completed matches, and innings.
 */
export function computeStandingsData(params: {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  innings: Innings[];
}): StandingsCalculationResult[] {
  const { tournament, teams, matches, innings } = params;

  const oversPerSide = tournament.config?.matchRules?.oversPerSide ?? tournament.oversPerSide ?? 4;
  const ballsPerOver = tournament.config?.matchRules?.ballsPerOver ?? 6;

  const distinctGroups = new Set(
    teams
      .map((t) => (t.groupName || "").trim().toUpperCase())
      .filter(Boolean),
  );
  const configIsGrouped = tournament.config?.stages?.some((s: any) => s.type === "GROUPS");
  const isGrouped =
    tournament.stageFormat === "GROUPS_AND_KNOCKOUT" ||
    (tournament.stageFormat !== "ROUND_ROBIN" && (configIsGrouped || (!tournament.stageFormat && (distinctGroups.size >= 2 || (tournament.groupCount !== undefined && tournament.groupCount > 1)))));

  const groupStage = tournament.config?.stages?.find((s: any) => s.type === "GROUPS");
  const configAdvance = groupStage?.groups?.[0]?.qualifyingSlots;
  const teamsPerGroupAdvance = configAdvance ?? tournament.teamsPerGroupAdvance ?? (tournament.groupPlayoffFormat === "GROUP_SEMI_FINALS" ? 2 : 1);

  const winPoints = tournament.config?.pointsConfig?.win ?? tournament.winPoints ?? 2;
  const tiePoints = tournament.config?.pointsConfig?.tie ?? tournament.tiePoints ?? 1;
  const noResultPoints = tournament.config?.pointsConfig?.noResult ?? tournament.noResultPoints ?? 1;
  const lossPoints = tournament.config?.pointsConfig?.loss ?? tournament.lossPoints ?? 0;

  // Group teams mapping
  const teamGroupMap = new Map<string, string>();
  for (const t of teams) {
    teamGroupMap.set(t.id, (t.groupName || "A").trim().toUpperCase());
  }

  // Match -> Innings map
  const matchInningsMap = new Map<string, Innings[]>();
  for (const inn of innings) {
    const list = matchInningsMap.get(inn.matchId) || [];
    list.push(inn);
    matchInningsMap.set(inn.matchId, list);
  }

  // Standings map per team
  const recordMap = new Map<
    string,
    {
      played: number;
      won: number;
      lost: number;
      tied: number;
      noResult: number;
      points: number;
      runsFor: number;
      ballsFor: number;
      runsAgainst: number;
      ballsAgainst: number;
    }
  >();

  for (const t of teams) {
    recordMap.set(t.id, {
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      noResult: 0,
      points: 0,
      runsFor: 0,
      ballsFor: 0,
      runsAgainst: 0,
      ballsAgainst: 0,
    });
  }

  // Process completed LEAGUE matches only
  const completedLeagueMatches = matches.filter(
    (m) => m.stage === "LEAGUE" && (m.status === "COMPLETED" || m.status === "ABANDONED"),
  );

  for (const m of completedLeagueMatches) {
    if (!m.teamAId || !m.teamBId) continue;
    const recA = recordMap.get(m.teamAId);
    const recB = recordMap.get(m.teamBId);
    if (!recA || !recB) continue;

    if (m.status === "ABANDONED") {
      recA.played += 1;
      recA.noResult += 1;
      recA.points += noResultPoints;

      recB.played += 1;
      recB.noResult += 1;
      recB.points += noResultPoints;
      continue;
    }

    recA.played += 1;
    recB.played += 1;

    if (m.winningTeamId === m.teamAId) {
      recA.won += 1;
      recA.points += winPoints;
      recB.lost += 1;
      recB.points += lossPoints;
    } else if (m.winningTeamId === m.teamBId) {
      recB.won += 1;
      recB.points += winPoints;
      recA.lost += 1;
      recA.points += lossPoints;
    } else {
      // Tie
      recA.tied += 1;
      recA.points += tiePoints;
      recB.tied += 1;
      recB.points += tiePoints;
    }

    // Process innings for NRR
    const mInnings = matchInningsMap.get(m.id) || [];
    const inn1 = mInnings.find((i) => i.inningsNumber === 1);
    const inn2 = mInnings.find((i) => i.inningsNumber === 2);

    if (inn1 && inn2) {
      const runs1 = (inn1 as any).runs ?? (inn1 as any).totalRuns ?? 0;
      const runs2 = (inn2 as any).runs ?? (inn2 as any).totalRuns ?? 0;
      const balls1 = (inn1 as any).balls ?? (inn1 as any).totalBalls ?? 0;
      const balls2 = (inn2 as any).balls ?? (inn2 as any).totalBalls ?? 0;
      const allOut1 = Boolean(inn1.isAllOut ?? (inn1 as any).allOut);
      const allOut2 = Boolean(inn2.isAllOut ?? (inn2 as any).allOut);

      const matchQuotaBalls = ((m.oversPerSide ?? oversPerSide) || 4) * ballsPerOver;
      const b1 = effectiveNrrBalls(balls1, allOut1, matchQuotaBalls);
      const b2 = effectiveNrrBalls(balls2, allOut2, matchQuotaBalls);

      const team1 = recordMap.get(inn1.battingTeamId);
      const team2 = recordMap.get(inn2.battingTeamId);

      if (team1 && team2) {
        team1.runsFor += runs1;
        team1.ballsFor += b1;
        team1.runsAgainst += runs2;
        team1.ballsAgainst += b2;

        team2.runsFor += runs2;
        team2.ballsFor += b2;
        team2.runsAgainst += runs1;
        team2.ballsAgainst += b1;
      }
    }
  }

  // Partition and rank
  const groupsToProcess = isGrouped
    ? Array.from(new Set(Array.from(teamGroupMap.values()))).sort()
    : ["ALL"];

  const results: StandingsCalculationResult[] = [];

  for (const g of groupsToProcess) {
    const groupTeams = teams.filter((t) =>
      isGrouped ? (teamGroupMap.get(t.id) || "A") === g : true,
    );

    const groupRows = groupTeams.map((t) => {
      const rec = recordMap.get(t.id)!;
      const nrr = computeNrr(rec.runsFor, rec.ballsFor, rec.runsAgainst, rec.ballsAgainst);
      return {
        teamId: t.id,
        groupName: isGrouped ? g : "",
        played: rec.played,
        won: rec.won,
        lost: rec.lost,
        tied: rec.tied,
        noResult: rec.noResult,
        points: rec.points,
        runsFor: rec.runsFor,
        ballsFor: rec.ballsFor,
        runsAgainst: rec.runsAgainst,
        ballsAgainst: rec.ballsAgainst,
        netRunRate: Number(nrr.toFixed(3)),
        nrr: Number(nrr.toFixed(3)),
        position: 1,
        status: "ACTIVE" as StandingsCalculationResult["status"],
      };
    });

    // Sort: Points DESC, NRR DESC, Won DESC
    groupRows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (Math.abs(b.netRunRate - a.netRunRate) > 0.0001) return b.netRunRate - a.netRunRate;
      return b.won - a.won;
    });

    const leagueMatches = matches.filter((m) => !m.stage || m.stage.toUpperCase() === "LEAGUE");
    const allLeagueCompleted =
      leagueMatches.length > 0 &&
      leagueMatches.every((m) => m.status === "COMPLETED" || m.status === "ABANDONED" || m.status === "NO_RESULT");

    const cutoff = isGrouped ? teamsPerGroupAdvance : (tournament.playoffFormat === "DIRECT_TOP2" ? 2 : tournament.playoffFormat === "PAGE_PLAYOFF_TOP3" ? 3 : 4);

    groupRows.forEach((row, idx) => {
      row.position = idx + 1;
      row.status = allLeagueCompleted
        ? (row.position <= cutoff ? "QUALIFIED_PLAYOFF" : "ELIMINATED")
        : "ACTIVE";
      results.push(row);
    });
  }

  return results;
}

/**
 * Pure function: calculates bracket promotion updates based on tournament rules and current matches.
 */
export function computeBracketPromotions(params: {
  tournament: Tournament;
  matches: Match[];
  standings: StandingsCalculationResult[];
}): { matchId: string; teamAId?: string | null; teamBId?: string | null }[] {
  const { tournament, matches, standings } = params;
  const updates: { matchId: string; teamAId?: string | null; teamBId?: string | null }[] = [];

  const leagueMatches = matches.filter((m) => m.stage === "LEAGUE");
  const allLeagueCompleted =
    leagueMatches.length > 0 &&
    leagueMatches.every((m) => m.status === "COMPLETED" || m.status === "ABANDONED");

  if (!allLeagueCompleted) {
    for (const m of matches) {
      if (m.stage && m.stage !== "LEAGUE" && m.status !== "COMPLETED" && (m.teamAId !== null || m.teamBId !== null)) {
        updates.push({ matchId: m.id, teamAId: null, teamBId: null });
      }
    }
    return updates;
  }

  const configIsGrouped = tournament.config?.stages?.some((s: any) => s.type === "GROUPS");
  const isGrouped =
    tournament.stageFormat === "GROUPS_AND_KNOCKOUT" ||
    (tournament.stageFormat !== "ROUND_ROBIN" && (configIsGrouped || (!tournament.stageFormat && standings.some((s) => s.groupName === "A") && standings.some((s) => s.groupName === "B"))));

  if (isGrouped) {
    const groupAStandings = standings.filter((s) => s.groupName === "A").sort((a, b) => a.position - b.position);
    const groupBStandings = standings.filter((s) => s.groupName === "B").sort((a, b) => a.position - b.position);

    const a1 = groupAStandings[0]?.teamId ?? null;
    const a2 = groupAStandings[1]?.teamId ?? null;
    const b1 = groupBStandings[0]?.teamId ?? null;
    const b2 = groupBStandings[1]?.teamId ?? null;

    const semi1 = matches.find((m) => m.stage === "SEMI_1");
    const semi2 = matches.find((m) => m.stage === "SEMI_2");
    const finalMatch = matches.find((m) => m.stage === "FINAL");

    if (tournament.groupPlayoffFormat === "GROUP_DIRECT_FINAL") {
      if (allLeagueCompleted && finalMatch && a1 && b1) {
        if (finalMatch.teamAId !== a1 || finalMatch.teamBId !== b1) {
          updates.push({ matchId: finalMatch.id, teamAId: a1, teamBId: b1 });
        }
      }
    } else {
      // Semi Finals
      if (allLeagueCompleted && semi1 && a1 && b2) {
        if (semi1.teamAId !== a1 || semi1.teamBId !== b2) {
          updates.push({ matchId: semi1.id, teamAId: a1, teamBId: b2 });
        }
      }
      if (allLeagueCompleted && semi2 && b1 && a2) {
        if (semi2.teamAId !== b1 || semi2.teamBId !== a2) {
          updates.push({ matchId: semi2.id, teamAId: b1, teamBId: a2 });
        }
      }

      // Grand Final from SF winners
      if (finalMatch && semi1?.status === "COMPLETED" && semi2?.status === "COMPLETED") {
        const winnerSF1 = semi1.winningTeamId ?? null;
        const winnerSF2 = semi2.winningTeamId ?? null;
        if (winnerSF1 && winnerSF2) {
          if (finalMatch.teamAId !== winnerSF1 || finalMatch.teamBId !== winnerSF2) {
            updates.push({ matchId: finalMatch.id, teamAId: winnerSF1, teamBId: winnerSF2 });
          }
        }
      }
    }
  } else {
    // Single Table Playoffs
    const rank1 = standings[0]?.teamId ?? null;
    const rank2 = standings[1]?.teamId ?? null;
    const rank3 = standings[2]?.teamId ?? null;
    const rank4 = standings[3]?.teamId ?? null;

    const finalMatch = matches.find((m) => m.stage === "FINAL");

    if (tournament.playoffFormat === "DIRECT_TOP2") {
      if (allLeagueCompleted && finalMatch && rank1 && rank2) {
        if (finalMatch.teamAId !== rank1 || finalMatch.teamBId !== rank2) {
          updates.push({ matchId: finalMatch.id, teamAId: rank1, teamBId: rank2 });
        }
      }
    } else if (tournament.playoffFormat === "PAGE_PLAYOFF_TOP3") {
      const playoff = matches.find((m) => m.stage === "PLAYOFF");
      if (allLeagueCompleted && playoff && rank2 && rank3) {
        if (playoff.teamAId !== rank2 || playoff.teamBId !== rank3) {
          updates.push({ matchId: playoff.id, teamAId: rank2, teamBId: rank3 });
        }
      }
      if (finalMatch && playoff?.status === "COMPLETED" && playoff.winningTeamId && rank1) {
        if (finalMatch.teamAId !== rank1 || finalMatch.teamBId !== playoff.winningTeamId) {
          updates.push({ matchId: finalMatch.id, teamAId: rank1, teamBId: playoff.winningTeamId });
        }
      }
    } else if (tournament.playoffFormat === "IPL_TOP4") {
      const q1 = matches.find((m) => m.stage === "QUALIFIER_1");
      const el = matches.find((m) => m.stage === "ELIMINATOR");
      const q2 = matches.find((m) => m.stage === "QUALIFIER_2");

      if (allLeagueCompleted && q1 && rank1 && rank2) {
        if (q1.teamAId !== rank1 || q1.teamBId !== rank2) {
          updates.push({ matchId: q1.id, teamAId: rank1, teamBId: rank2 });
        }
      }
      if (allLeagueCompleted && el && rank3 && rank4) {
        if (el.teamAId !== rank3 || el.teamBId !== rank4) {
          updates.push({ matchId: el.id, teamAId: rank3, teamBId: rank4 });
        }
      }
      if (q1?.status === "COMPLETED" && el?.status === "COMPLETED" && q2) {
        const loserQ1 = q1.winningTeamId === q1.teamAId ? q1.teamBId : q1.teamAId;
        const winnerEl = el.winningTeamId;
        if (loserQ1 && winnerEl && (q2.teamAId !== loserQ1 || q2.teamBId !== winnerEl)) {
          updates.push({ matchId: q2.id, teamAId: loserQ1, teamBId: winnerEl });
        }
      }
      if (q1?.status === "COMPLETED" && q2?.status === "COMPLETED" && finalMatch) {
        const winnerQ1 = q1.winningTeamId;
        const winnerQ2 = q2.winningTeamId;
        if (winnerQ1 && winnerQ2 && (finalMatch.teamAId !== winnerQ1 || finalMatch.teamBId !== winnerQ2)) {
          updates.push({ matchId: finalMatch.id, teamAId: winnerQ1, teamBId: winnerQ2 });
        }
      }
    } else if (tournament.playoffFormat === "SEMI_FINALS") {
      const sf1 = matches.find((m) => m.stage === "SEMI_1");
      const sf2 = matches.find((m) => m.stage === "SEMI_2");

      if (allLeagueCompleted && sf1 && rank1 && rank4) {
        if (sf1.teamAId !== rank1 || sf1.teamBId !== rank4) {
          updates.push({ matchId: sf1.id, teamAId: rank1, teamBId: rank4 });
        }
      }
      if (allLeagueCompleted && sf2 && rank2 && rank3) {
        if (sf2.teamAId !== rank2 || sf2.teamBId !== rank3) {
          updates.push({ matchId: sf2.id, teamAId: rank2, teamBId: rank3 });
        }
      }
      if (sf1?.status === "COMPLETED" && sf2?.status === "COMPLETED" && finalMatch) {
        const win1 = sf1.winningTeamId;
        const win2 = sf2.winningTeamId;
        if (win1 && win2 && (finalMatch.teamAId !== win1 || finalMatch.teamBId !== win2)) {
          updates.push({ matchId: finalMatch.id, teamAId: win1, teamBId: win2 });
        }
      }
    }
  }

  return updates;
}

/**
 * Orchestrator executed in Firebase Cloud Functions:
 * Reads live state, computes standings, updates brackets, and saves updates atomically to Firestore.
 */
export async function executeTournamentBrain(
  firestore: admin.firestore.Firestore,
  tournamentId: string,
): Promise<{ standingsCount: number; bracketUpdatesCount: number; crownedChampion?: string | null }> {
  // 1. Fetch Tournament
  const tourneySnap = await firestore.collection("tournaments").doc(tournamentId).get();
  if (!tourneySnap.exists) {
    throw new Error(`Tournament ${tournamentId} not found`);
  }
  const tournament = { id: tourneySnap.id, ...tourneySnap.data() } as Tournament;

  // 2. Fetch all matches of tournament
  const matchesSnap = await firestore
    .collection("matches")
    .where("tournamentId", "==", tournamentId)
    .get();
  const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Match));

  // 3. Fetch all teams of tournament (direct, memberships, or match participants)
  const [teamsSnap, membershipsSnap] = await Promise.all([
    firestore.collection("teams").where("tournamentId", "==", tournamentId).get(),
    firestore.collection("tournamentTeamMemberships").where("tournamentId", "==", tournamentId).get(),
  ]);
  let teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);

  const memTeamIdsToFetch: {
    teamId: string;
    groupName?: string;
    teamName?: string;
    teamShortName?: string;
    teamLogoUrl?: string | null;
  }[] = [];

  for (const mDoc of membershipsSnap.docs) {
    const mData = mDoc.data() as any;
    if (mData.teamId && !teams.some((t) => t.id === mData.teamId)) {
      memTeamIdsToFetch.push({
        teamId: mData.teamId,
        groupName: mData.groupName,
        teamName: mData.teamName,
        teamShortName: mData.teamShortName,
        teamLogoUrl: mData.teamLogoUrl,
      });
    }
  }

  if (memTeamIdsToFetch.length > 0) {
    const memSnaps = await Promise.all(
      memTeamIdsToFetch.map((item) => firestore.collection("teams").doc(item.teamId).get()),
    );
    memSnaps.forEach((tSnap, idx) => {
      const item = memTeamIdsToFetch[idx];
      if (tSnap.exists) {
        const tData = { id: tSnap.id, ...tSnap.data() } as Team;
        if (item.groupName) tData.groupName = item.groupName;
        teams.push(tData);
      } else if (item.teamName) {
        teams.push({
          id: item.teamId,
          tournamentId,
          name: item.teamName,
          shortName: item.teamShortName || item.teamName.slice(0, 3).toUpperCase(),
          groupName: item.groupName || "A",
          logoUrl: item.teamLogoUrl || null,
        } as Team);
      }
    });
  }

  // Also include any teams referenced in matches that might still be missing
  const matchTeamIds = Array.from(
    new Set(
      matches
        .flatMap((m) => [m.teamAId, m.teamBId])
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const missingMatchTeamIds = matchTeamIds.filter((id) => !teams.some((t) => t.id === id));
  if (missingMatchTeamIds.length > 0) {
    const matchSnaps = await Promise.all(
      missingMatchTeamIds.map((id) => firestore.collection("teams").doc(id).get()),
    );
    matchSnaps.forEach((snap) => {
      if (snap.exists) {
        teams.push({ id: snap.id, ...snap.data() } as Team);
      }
    });
  }

  // Deduplicate teams by ID
  const seenIds = new Set<string>();
  teams = teams.filter((t) => {
    if (seenIds.has(t.id)) return false;
    seenIds.add(t.id);
    return true;
  });

  // If tournament is explicitly ROUND_ROBIN, strictly purge all group names and group config fields!
  if (tournament.stageFormat === "ROUND_ROBIN") {
    teams.forEach((t) => { t.groupName = ""; });
    const cleanUpdate: Record<string, any> = {
      groupCount: admin.firestore.FieldValue.delete(),
      groups: admin.firestore.FieldValue.delete(),
      teamsPerGroupAdvance: admin.firestore.FieldValue.delete(),
      groupPlayoffFormat: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (tournament.config) {
      cleanUpdate["config.uiPresentation.showGroupTabs"] = false;
      cleanUpdate["config.uiPresentation.standingsLayout"] = "SINGLE_LEAGUE";
    }
    await firestore.collection("tournaments").doc(tournamentId).update(cleanUpdate).catch(() => {});

    // Also purge groupName from all memberships and teams
    const purgeBatch = firestore.batch();
    let hasPurgeOps = false;
    for (const mDoc of membershipsSnap.docs) {
      if ((mDoc.data() as any).groupName) {
        purgeBatch.update(mDoc.ref, { groupName: admin.firestore.FieldValue.delete() });
        hasPurgeOps = true;
      }
    }
    for (const tDoc of teamsSnap.docs) {
      if ((tDoc.data() as any).groupName) {
        purgeBatch.update(tDoc.ref, { groupName: admin.firestore.FieldValue.delete() });
        hasPurgeOps = true;
      }
    }
    if (hasPurgeOps) {
      await purgeBatch.commit().catch(() => {});
    }
  } else {
    // Assign groupName from memberships if team doc lacked it
    for (const mDoc of membershipsSnap.docs) {
      const mData = mDoc.data() as any;
      if (mData.teamId && mData.groupName) {
        const t = teams.find((x) => x.id === mData.teamId);
        if (t && !t.groupName) t.groupName = mData.groupName;
      }
    }

    // Detect and persist group stageFormat if not explicitly set
    const distinctGroups = new Set(
      teams
        .map((t) => (t.groupName || "").trim().toUpperCase())
        .filter(Boolean),
    );
    if (
      !tournament.stageFormat &&
      (distinctGroups.size >= 2 || (tournament.groupCount !== undefined && tournament.groupCount > 1))
    ) {
      tournament.stageFormat = "GROUPS_AND_KNOCKOUT";
      tournament.groupCount = 2;
      tournament.groups = ["A", "B"];
      tournament.teamsPerGroupAdvance = 2;
      tournament.groupPlayoffFormat = "GROUP_SEMI_FINALS";
      tournament.playoffFormat = "SEMI_FINALS";
      await firestore.collection("tournaments").doc(tournamentId).set(
        {
          stageFormat: "GROUPS_AND_KNOCKOUT",
          groupCount: 2,
          groups: ["A", "B"],
          teamsPerGroupAdvance: 2,
          groupPlayoffFormat: "GROUP_SEMI_FINALS",
          playoffFormat: "SEMI_FINALS",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  // 4. Fetch completed innings for all matches
  const matchIds = matches.map((m) => m.id);
  const innings: Innings[] = [];

  // Firestore in queries allow up to 30 items per query
  for (let i = 0; i < matchIds.length; i += 30) {
    const chunk = matchIds.slice(i, i + 30);
    const innSnap = await firestore
      .collection("innings")
      .where("matchId", "in", chunk)
      .get();
    innSnap.docs.forEach((d) => innings.push({ id: d.id, ...d.data() } as Innings));
  }

  // 5. Compute Standings
  const standings = computeStandingsData({
    tournament,
    teams,
    matches,
    innings,
  });

  // Batch write standings
  const batch = firestore.batch();
  const activeStandingIds = new Set<string>();
  for (const s of standings) {
    const standingId = `${tournamentId}_${s.teamId}`;
    activeStandingIds.add(standingId);
    const ref = firestore.collection("standings").doc(standingId);
    batch.set(
      ref,
      {
        ...s,
        teamName: teams.find((t) => t.id === s.teamId)?.name ?? null,
        tournamentId,
        qualified: s.status === "QUALIFIED_PLAYOFF",
        eliminated: s.status === "ELIMINATED",
        qualificationStatus:
          s.status === "QUALIFIED_PLAYOFF"
            ? "QUALIFIED_PLAYOFF"
            : s.status === "ELIMINATED"
              ? "ELIMINATED"
              : "IN_CONTENTION",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  // Delete obsolete standings docs for this tournament
  const existingStandingsSnap = await firestore
    .collection("standings")
    .where("tournamentId", "==", tournamentId)
    .get();
  for (const doc of existingStandingsSnap.docs) {
    if (!activeStandingIds.has(doc.id)) {
      batch.delete(doc.ref);
    }
  }

  // 6. Compute Bracket Promotions
  const bracketUpdates = computeBracketPromotions({
    tournament,
    matches,
    standings,
  });

  for (const upd of bracketUpdates) {
    const matchRef = firestore.collection("matches").doc(upd.matchId);
    batch.update(matchRef, {
      teamAId: upd.teamAId ?? null,
      teamBId: upd.teamBId ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // 7. Check Grand Final completion & crown champion
  let crownedChampion: string | null = null;
  const finalMatch = matches.find((m) => m.stage === "FINAL" || m.stage === "GRAND_FINAL");
  if (finalMatch?.status === "COMPLETED" && finalMatch.winningTeamId) {
    crownedChampion = finalMatch.winningTeamId;
  }
  const allMatchesDone =
    matches.length > 0 &&
    matches.every((m) => m.status === "COMPLETED" || m.status === "ABANDONED" || m.status === "NO_RESULT");

  if (allMatchesDone || crownedChampion) {
    const tourneyRef = firestore.collection("tournaments").doc(tournamentId);
    const champId = crownedChampion || standings[0]?.teamId || null;
    batch.update(tourneyRef, {
      ...(champId ? { championTeamId: champId } : {}),
      status: "COMPLETED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return {
    standingsCount: standings.length,
    bracketUpdatesCount: bracketUpdates.length,
    crownedChampion,
  };
}
