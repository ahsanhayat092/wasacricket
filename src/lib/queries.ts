/**
 * All Firestore read functions used by the public and admin UI.
 * These replace the tRPC tournament/admin router queries.
 */

import {
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import {
  tournamentDoc,
  teamsCol,
  playersCol,
  matchesCol,
  inningsCol,
  battingScoresCol,
  bowlingScoresCol,
  standingsCol,
  usersCol,
  teamDoc,
  matchDoc,
  TOURNAMENT_ID,
  type Tournament,
  type Team,
  type Player,
  type Match,
  type Innings,
  type BattingScore,
  type BowlingScore,
  type Standing,
  type UserAccount,
  type UserRole,
  type HydratedMatch,
  type InningsWithScores,
  type StandingWithTeam,
} from "./firestore";
import {
  getTournamentBattingStats,
  getTournamentBowlingStats,
  getTournamentSummaryStats,
} from "./tournament-logic";

// ---------------------------------------------------------------------------
// Tournament
// ---------------------------------------------------------------------------

export async function getTournament(): Promise<Tournament> {
  const snap = await getDoc(tournamentDoc());
  if (!snap.exists()) {
    return {
      id: TOURNAMENT_ID,
      name: "WASA Premier League",
      shortName: "WPL",
      winPoints: 2,
      tiePoints: 1,
      noResultPoints: 1,
      lossPoints: 0,
      oversPerSide: 10,
      championTeamId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return { id: snap.id, ...snap.data() } as Tournament;
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export async function getTeams(): Promise<Team[]> {
  const snap = await getDocs(
    query(teamsCol(), where("tournamentId", "==", TOURNAMENT_ID)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  const snap = await getDoc(teamDoc(teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Team;
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export async function getPlayers(): Promise<Player[]> {
  const snap = await getDocs(playersCol());
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
}

export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  const snap = await getDocs(
    query(playersCol(), where("teamId", "==", teamId)),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

async function hydrateMatch(m: Match, teams: Team[]): Promise<HydratedMatch> {
  const find = (id: string | null | undefined) =>
    teams.find((t) => t.id === id) ?? null;
  return {
    ...m,
    teamA: find(m.teamAId),
    teamB: find(m.teamBId),
    tossWinner: find(m.tossWinnerId),
    winningTeam: find(m.winningTeamId),
  };
}

export async function getSchedule(): Promise<HydratedMatch[]> {
  try {
    const [matchSnap, teams] = await Promise.all([
      getDocs(query(matchesCol(), where("tournamentId", "==", TOURNAMENT_ID))),
      getTeams(),
    ]);
    const matches = matchSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Match)
      .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
    return Promise.all(matches.map((m) => hydrateMatch(m, teams)));
  } catch (err) {
    console.error("Error loading schedule:", err);
    return [];
  }
}

export async function getResults(): Promise<HydratedMatch[]> {
  const all = await getSchedule();
  return all.filter(
    (m) =>
      m.status === "COMPLETED" ||
      m.status === "NO_RESULT" ||
      m.status === "ABANDONED",
  );
}

export async function getMatchById(matchId: string): Promise<{
  match: HydratedMatch;
  innings: InningsWithScores[];
  playerOfMatch: Player | null;
} | null> {
  const snap = await getDoc(matchDoc(matchId));
  if (!snap.exists()) return null;
  const match = { id: snap.id, ...snap.data() } as Match;

  const [teams, players, inningsSnap] = await Promise.all([
    getTeams(),
    getPlayers(),
    getDocs(query(inningsCol(), where("matchId", "==", matchId))),
  ]);

  const hydrated = await hydrateMatch(match, teams);
  const inningsList = inningsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Innings)
    .sort((a, b) => a.inningsNumber - b.inningsNumber);

  const inningsIds = inningsList.map((i) => i.id);
  const [battingSnap, bowlingSnap] = inningsIds.length
    ? await Promise.all([
        getDocs(query(battingScoresCol(), where("inningsId", "in", inningsIds))),
        getDocs(query(bowlingScoresCol(), where("inningsId", "in", inningsIds))),
      ])
    : [{ docs: [] }, { docs: [] }];

  const battingAll = battingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BattingScore);
  const bowlingAll = bowlingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BowlingScore);

  const playerName = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Unknown";

  const inningsWithScores: InningsWithScores[] = inningsList.map((inn) => ({
    ...inn,
    batting: battingAll
      .filter((b) => b.inningsId === inn.id)
      .sort((a, b) => a.battingOrder - b.battingOrder)
      .map((b) => ({ ...b, playerName: playerName(b.playerId) })),
    bowling: bowlingAll
      .filter((b) => b.inningsId === inn.id)
      .map((b) => ({ ...b, playerName: playerName(b.playerId) })),
  }));

  const playerOfMatch = match.playerOfMatchId
    ? (players.find((p) => p.id === match.playerOfMatchId) ?? null)
    : null;

  return { match: hydrated, innings: inningsWithScores, playerOfMatch };
}

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

export async function getStandings(): Promise<StandingWithTeam[]> {
  try {
    const [standingSnap, teams] = await Promise.all([
      getDocs(query(standingsCol(), where("tournamentId", "==", TOURNAMENT_ID))),
      getTeams(),
    ]);
    const standings = standingSnap.docs
      .map((d) => {
        const s = { id: d.id, ...d.data() } as Standing;
        return { ...s, team: teams.find((t) => t.id === s.teamId) ?? null };
      })
      .sort((a, b) => (a.position || 0) - (b.position || 0));
    return standings;
  } catch (err) {
    console.error("Error loading standings:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Overview (home page)
// ---------------------------------------------------------------------------

export async function getOverview() {
  const [tournament, schedule, standingsWithTeams] = await Promise.all([
    getTournament(),
    getSchedule(),
    getStandings(),
  ]);
  if (!tournament) return null;

  const teams = standingsWithTeams
    .map((s) => s.team)
    .filter((t): t is Team => t !== null);

  const champion = tournament.championTeamId
    ? (teams.find((t) => t.id === tournament.championTeamId) ?? null)
    : null;

  const live = schedule.find((m) => m.status === "LIVE") ?? null;
  const upcoming = schedule.filter((m) => m.status === "UPCOMING");
  const finished = schedule.filter(
    (m) => m.status === "COMPLETED" || m.status === "NO_RESULT",
  );

  const [batting, bowling] = await Promise.all([
    getTournamentBattingStats(schedule),
    getTournamentBowlingStats(schedule),
  ]);

  return {
    tournament,
    champion,
    live,
    nextMatch: upcoming[0] ?? null,
    latestResult: finished[finished.length - 1] ?? null,
    upcoming: upcoming.slice(0, 4),
    recentResults: finished.slice(-4).reverse(),
    standings: standingsWithTeams,
    topBatsman: batting[0] ?? null,
    topBowler: bowling[0] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Team detail
// ---------------------------------------------------------------------------

export async function getTeamDetail(teamId: string) {
  const [team, players, schedule, standings] = await Promise.all([
    getTeamById(teamId),
    getPlayersByTeam(teamId),
    getSchedule(),
    getStandings(),
  ]);
  if (!team) return null;

  const relevant = schedule.filter(
    (m) => m.teamAId === teamId || m.teamBId === teamId,
  );
  const standing = standings.find((s) => s.teamId === teamId) ?? null;

  return { team, players, matches: relevant, standing };
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export async function getStatistics() {
  const [schedule, teams] = await Promise.all([getSchedule(), getTeams()]);
  const [batting, bowling, summary] = await Promise.all([
    getTournamentBattingStats(schedule),
    getTournamentBowlingStats(schedule),
    getTournamentSummaryStats(schedule),
  ]);
  return { batting, bowling, summary, teams };
}

// ---------------------------------------------------------------------------
// Admin — dashboard
// ---------------------------------------------------------------------------

export async function getAdminDashboard() {
  const [teams, players, schedule, standings] = await Promise.all([
    getTeams(),
    getPlayers(),
    getSchedule(),
    getStandings(),
  ]);
  const summary = getTournamentSummarySync(schedule);
  const top = standings.slice(0, 2);

  return {
    totalTeams: teams.length,
    totalPlayers: players.length,
    ...summary,
    rank1: top[0]
      ? { ...top[0], team: top[0].team }
      : null,
    rank2: top[1]
      ? { ...top[1], team: top[1].team }
      : null,
  };
}

function getTournamentSummarySync(schedule: HydratedMatch[]) {
  const completed = schedule.filter((m) => m.status === "COMPLETED");
  return {
    totalMatches: schedule.length,
    completedMatches: completed.length,
    liveMatches: schedule.filter((m) => m.status === "LIVE").length,
    upcomingMatches: schedule.filter((m) => m.status === "UPCOMING").length,
    totalRuns: 0, // fetched async in getTournamentSummaryStats
    totalWickets: 0,
  };
}

// ---------------------------------------------------------------------------
// Admin — match workspace
// ---------------------------------------------------------------------------

export async function getMatchWorkspace(matchId: string) {
  const snap = await getDoc(matchDoc(matchId));
  if (!snap.exists()) return null;
  const match = { id: snap.id, ...snap.data() } as Match;

  const teamIds = [match.teamAId, match.teamBId].filter(
    (x): x is string => !!x,
  );

  const [allPlayers, inningsSnap] = await Promise.all([
    teamIds.length
      ? getDocs(query(playersCol(), where("teamId", "in", teamIds)))
      : Promise.resolve({ docs: [] }),
    getDocs(query(inningsCol(), where("matchId", "==", matchId))),
  ]);

  const teams: Team[] = [];
  for (const id of teamIds) {
    const t = await getTeamById(id);
    if (t) teams.push(t);
  }

  const players = allPlayers.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
  const inningsList = inningsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings);
  const inningsIds = inningsList.map((i) => i.id);

  const [battingSnap, bowlingSnap] = inningsIds.length
    ? await Promise.all([
        getDocs(query(battingScoresCol(), where("inningsId", "in", inningsIds))),
        getDocs(query(bowlingScoresCol(), where("inningsId", "in", inningsIds))),
      ])
    : [{ docs: [] }, { docs: [] }];

  const battingAll = battingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BattingScore);
  const bowlingAll = bowlingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BowlingScore);

  return {
    match,
    teams,
    players,
    innings: inningsList.map((inn) => ({
      ...inn,
      batting: battingAll.filter((b) => b.inningsId === inn.id),
      bowling: bowlingAll.filter((b) => b.inningsId === inn.id),
    })),
  };
}

// ---------------------------------------------------------------------------
// Real-time subscription for live match
// ---------------------------------------------------------------------------

export function subscribeToMatch(
  matchId: string,
  callback: (data: {
    match: Match;
    innings: (Innings & { batting: BattingScore[]; bowling: BowlingScore[] })[];
  }) => void,
): Unsubscribe {
  return onSnapshot(matchDoc(matchId), async (snap) => {
    if (!snap.exists()) return;
    const match = { id: snap.id, ...snap.data() } as Match;

    const inningsSnap = await getDocs(
      query(inningsCol(), where("matchId", "==", matchId)),
    );
    const inningsList = inningsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings);
    const inningsIds = inningsList.map((i) => i.id);

    const [battingSnap, bowlingSnap] = inningsIds.length
      ? await Promise.all([
          getDocs(query(battingScoresCol(), where("inningsId", "in", inningsIds))),
          getDocs(query(bowlingScoresCol(), where("inningsId", "in", inningsIds))),
        ])
      : [{ docs: [] }, { docs: [] }];

    const battingAll = battingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BattingScore);
    const bowlingAll = bowlingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BowlingScore);

    callback({
      match,
      innings: inningsList.map((inn) => ({
        ...inn,
        batting: battingAll.filter((b) => b.inningsId === inn.id),
        bowling: bowlingAll.filter((b) => b.inningsId === inn.id),
      })),
    });
  });
}

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------

export async function getUsers(): Promise<UserAccount[]> {
  try {
    const snap = await getDocs(usersCol());
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserAccount);
  } catch (err) {
    console.error("Error loading users:", err);
    return [];
  }
}

export async function getUserRole(email: string): Promise<UserRole | null> {
  try {
    const snap = await getDocs(
      query(usersCol(), where("email", "==", email.toLowerCase().trim())),
    );
    if (snap.empty) return null;
    const doc = snap.docs[0].data() as UserAccount;
    return doc.role;
  } catch (err) {
    console.error("Error getting user role:", err);
    return null;
  }
}
