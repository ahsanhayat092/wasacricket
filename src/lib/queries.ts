/**
 * All Firestore read functions used by the public and admin UI.
 * These replace the tRPC tournament/admin router queries.
 */

import {
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import {
  tournamentDoc,
  tournamentsCol,
  teamsCol,
  playersCol,
  matchesCol,
  inningsCol,
  battingScoresCol,
  bowlingScoresCol,
  standingsCol,
  usersCol,
  tournamentMembersCol,
  teamDoc,
  matchDoc,
  playerDoc,
  TOURNAMENT_ID,
  type Tournament,
  type TournamentMember,
  type TournamentRole,
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

export async function getTournaments(): Promise<Tournament[]> {
  const snap = await getDocs(tournamentsCol());
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tournament);
  // If "main" not in DB, prepend default WASA
  if (!list.some((t) => t.id === TOURNAMENT_ID)) {
    list.unshift({
      id: TOURNAMENT_ID,
      slug: "wasa-2026",
      name: "WASA Premier League 2026",
      shortName: "WPL 2026",
      winPoints: 2,
      tiePoints: 1,
      noResultPoints: 1,
      lossPoints: 0,
      oversPerSide: 4,
      status: "COMPLETED",
      formatType: "TAPE_BALL_INDOOR",
      venueName: "Askari XI, Lahore",
      venueMapsUrl: "https://maps.app.goo.gl/va7W9eD3MYWH2SyCA?g_st=ac",
      championTeamId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return list;
}

export async function getUserTournaments(userEmail?: string | null, userUid?: string | null): Promise<Tournament[]> {
  if (!userEmail && !userUid) return [];
  const email = userEmail?.toLowerCase().trim();
  const isSuperAdmin = email === "ahsanhayat092@gmail.com";

  if (isSuperAdmin) {
    return await getTournaments();
  }

  const [ownerSnap, ownerEmailSnap, memberSnap] = await Promise.all([
    userUid ? getDocs(query(tournamentsCol(), where("ownerId", "==", userUid))) : { docs: [] },
    email ? getDocs(query(tournamentsCol(), where("ownerEmail", "==", email))) : { docs: [] },
    email ? getDocs(query(tournamentMembersCol(), where("userEmail", "==", email))) : { docs: [] },
  ]);

  const map = new Map<string, Tournament>();
  for (const d of ownerSnap.docs) {
    map.set(d.id, { id: d.id, ...d.data() } as Tournament);
  }
  for (const d of ownerEmailSnap.docs) {
    map.set(d.id, { id: d.id, ...d.data() } as Tournament);
  }

  const memberTournamentIds = memberSnap.docs.map((d) => (d.data() as any).tournamentId);
  const missingIds = memberTournamentIds.filter((tId) => tId && !map.has(tId));

  if (missingIds.length > 0) {
    const memberTournaments = await Promise.all(
      missingIds.map(async (tId) => {
        const snap = await getDoc(tournamentDoc(tId));
        if (snap.exists()) {
          return { id: snap.id, ...snap.data() } as Tournament;
        }
        return null;
      }),
    );
    for (const t of memberTournaments) {
      if (t) map.set(t.id, t);
    }
  }

  return Array.from(map.values());
}

export async function checkTournamentAccess(
  tournamentId: string,
  userEmail?: string | null,
  userUid?: string | null,
): Promise<{ canManage: boolean; isOwner: boolean; role: string | null }> {
  if (!userEmail && !userUid) return { canManage: false, isOwner: false, role: null };
  const email = userEmail?.toLowerCase().trim();
  if (email === "ahsanhayat092@gmail.com") {
    return { canManage: true, isOwner: true, role: "OWNER" };
  }

  // Check tournament document
  const tSnap = await getDoc(tournamentDoc(tournamentId));
  if (tSnap.exists()) {
    const tData = tSnap.data() as Tournament;
    if (
      (userUid && tData.ownerId === userUid) ||
      (email && tData.ownerEmail && tData.ownerEmail.toLowerCase() === email)
    ) {
      return { canManage: true, isOwner: true, role: "OWNER" };
    }
  }

  // Check tournamentMembers collection
  if (email) {
    const memberSnap = await getDocs(
      query(
        tournamentMembersCol(),
        where("tournamentId", "==", tournamentId),
        where("userEmail", "==", email),
      ),
    );
    if (!memberSnap.empty) {
      const member = memberSnap.docs[0].data() as any;
      const role = member.role || "ADMIN";
      return {
        canManage: role === "OWNER" || role === "ADMIN",
        isOwner: role === "OWNER",
        role,
      };
    }
  }

  return { canManage: false, isOwner: false, role: null };
}

function resolveTournamentId(idOrContext?: any): string {
  if (typeof idOrContext === "string" && idOrContext.trim()) {
    return idOrContext.trim();
  }
  return TOURNAMENT_ID;
}

export async function getTournament(idOrContext?: any): Promise<Tournament> {
  const tournamentId = resolveTournamentId(idOrContext);
  const snap = await getDoc(tournamentDoc(tournamentId));
  if (!snap.exists()) {
    return {
      id: tournamentId,
      name: tournamentId === TOURNAMENT_ID ? "WASA Premier League" : "Cricket Tournament",
      shortName: tournamentId === TOURNAMENT_ID ? "WPL" : "CT",
      winPoints: 2,
      tiePoints: 1,
      noResultPoints: 1,
      lossPoints: 0,
      oversPerSide: 4,
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

export async function getTeams(idOrContext?: any): Promise<Team[]> {
  const tournamentId = resolveTournamentId(idOrContext);
  const snap = await getDocs(
    query(teamsCol(), where("tournamentId", "==", tournamentId)),
  );
  if (!snap.empty) {
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
  }
  // Fallback for default WASA teams
  if (tournamentId === TOURNAMENT_ID || tournamentId === "main") {
    const allSnap = await getDocs(teamsCol());
    return allSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Team)
      .filter((t) => !t.tournamentId || t.tournamentId === "main" || t.tournamentId === TOURNAMENT_ID);
  }
  return [];
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  const snap = await getDoc(teamDoc(teamId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Team;
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export async function getPlayers(idOrContext?: any): Promise<Player[]> {
  const tournamentId = idOrContext ? resolveTournamentId(idOrContext) : null;
  if (!tournamentId) {
    const snap = await getDocs(playersCol());
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
  }

  // Find teams for this tournament
  const teams = await getTeams(tournamentId);
  if (teams.length === 0) return [];
  const teamIds = new Set(teams.map((t) => t.id));

  const snap = await getDocs(playersCol());
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Player)
    .filter((p) => p.teamId && teamIds.has(p.teamId));
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

function hydrateMatch(
  m: Match,
  teams: Team[],
  innings: Innings[] = [],
  rank1Team: Team | null = null,
  rank2Team: Team | null = null,
  rank3Team: Team | null = null,
  playoffWinnerTeam: Team | null = null,
): HydratedMatch {
  const find = (id: string | null | undefined) =>
    teams.find((t) => t.id === id) ?? null;

  const isPlayoff = m.stage === "PLAYOFF" || m.stage?.toUpperCase() === "PLAYOFF";
  const isFinal = m.stage === "FINAL" || m.stage?.toUpperCase() === "FINAL";

  let teamA = find(m.teamAId);
  let teamB = find(m.teamBId);

  if (!teamA) {
    if (isPlayoff) teamA = rank2Team;
    else if (isFinal) teamA = rank1Team;
  }

  if (!teamB) {
    if (isPlayoff) teamB = rank3Team;
    else if (isFinal) teamB = playoffWinnerTeam;
  }

  return {
    ...m,
    day: m.day,
    date: m.date,
    time: m.time,
    teamAId: m.teamAId ?? teamA?.id ?? null,
    teamBId: m.teamBId ?? teamB?.id ?? null,
    teamA,
    teamB,
    tossWinner: find(m.tossWinnerId),
    winningTeam: find(m.winningTeamId),
    innings: innings.filter((i) => i.matchId === m.id).sort((a, b) => a.inningsNumber - b.inningsNumber),
  };
}

export async function getSchedule(idOrContext?: any): Promise<HydratedMatch[]> {
  const tournamentId = resolveTournamentId(idOrContext);
  try {
    let [matchSnap, teams, inningsSnap, standingsSnap] = await Promise.all([
      getDocs(query(matchesCol(), where("tournamentId", "==", tournamentId))),
      getTeams(tournamentId),
      getDocs(inningsCol()),
      getDocs(query(standingsCol(), where("tournamentId", "==", tournamentId))),
    ]);

    if (matchSnap.empty && (tournamentId === TOURNAMENT_ID || tournamentId === "main")) {
      const allMatchesSnap = await getDocs(matchesCol());
      const filteredDocs = allMatchesSnap.docs.filter((d) => {
        const data = d.data();
        return !data.tournamentId || data.tournamentId === "main" || data.tournamentId === TOURNAMENT_ID;
      });
      matchSnap = { docs: filteredDocs } as any;
    }

    const allInnings = inningsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings);
    const standings = standingsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Standing)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const matches = matchSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Match)
      .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));

    const playoffMatchRaw = matches.find(
      (m) => m.stage === "PLAYOFF" || m.stage?.toUpperCase() === "PLAYOFF" || m.matchNumber === 10,
    );
    const finalMatchRaw = matches.find(
      (m) => m.stage === "FINAL" || m.stage?.toUpperCase() === "FINAL" || m.matchNumber === 11,
    );
    const leagueMatchesRaw = matches.filter(
      (m) =>
        m.id !== playoffMatchRaw?.id &&
        m.id !== finalMatchRaw?.id &&
        m.stage?.toUpperCase() !== "PLAYOFF" &&
        m.stage?.toUpperCase() !== "FINAL",
    );
    const allLeagueDone =
      leagueMatchesRaw.length > 0 &&
      leagueMatchesRaw.every(
        (m) =>
          m.status === "COMPLETED" ||
          m.status === "NO_RESULT" ||
          m.status === "ABANDONED",
      );

    const rank1Team = allLeagueDone && standings[0]?.teamId ? teams.find((t) => t.id === standings[0].teamId) ?? null : null;
    const rank2Team = allLeagueDone && standings[1]?.teamId ? teams.find((t) => t.id === standings[1].teamId) ?? null : null;
    const rank3Team = allLeagueDone && standings[2]?.teamId ? teams.find((t) => t.id === standings[2].teamId) ?? null : null;
    const playoffWinnerTeam = playoffMatchRaw?.winningTeamId ? teams.find((t) => t.id === playoffMatchRaw.winningTeamId) ?? null : null;

    return matches.map((m) => hydrateMatch(m, teams, allInnings, rank1Team, rank2Team, rank3Team, playoffWinnerTeam));
  } catch (err) {
    console.error("Error loading schedule:", err);
    return [];
  }
}

export async function getResults(idOrContext?: any): Promise<HydratedMatch[]> {
  const all = await getSchedule(idOrContext);
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
  players: Player[];
  playerOfMatch: Player | null;
} | null> {
  const snap = await getDoc(matchDoc(matchId));
  if (!snap.exists()) return null;
  const match = { id: snap.id, ...snap.data() } as Match;

  const [teams, players, inningsSnap, standingsSnap, matchesSnap] = await Promise.all([
    getTeams(),
    getPlayers(),
    getDocs(query(inningsCol(), where("matchId", "==", matchId))),
    getDocs(query(standingsCol(), where("tournamentId", "==", TOURNAMENT_ID))),
    getDocs(query(matchesCol(), where("tournamentId", "==", TOURNAMENT_ID))),
  ]);

  const standings = standingsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Standing)
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  const allMatchesList = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match);
  const playoffMatchRaw = allMatchesList.find(
    (m) => m.stage === "PLAYOFF" || m.stage?.toUpperCase() === "PLAYOFF" || m.matchNumber === 10,
  );
  const finalMatchRaw = allMatchesList.find(
    (m) => m.stage === "FINAL" || m.stage?.toUpperCase() === "FINAL" || m.matchNumber === 11,
  );
  const leagueMatchesRaw = allMatchesList.filter(
    (m) =>
      m.id !== playoffMatchRaw?.id &&
      m.id !== finalMatchRaw?.id &&
      m.stage?.toUpperCase() !== "PLAYOFF" &&
      m.stage?.toUpperCase() !== "FINAL",
  );
  const allLeagueDone =
    leagueMatchesRaw.length > 0 &&
    leagueMatchesRaw.every(
      (m) =>
        m.status === "COMPLETED" ||
        m.status === "NO_RESULT" ||
        m.status === "ABANDONED",
    );

  const rank1Team = allLeagueDone && standings[0]?.teamId ? teams.find((t) => t.id === standings[0].teamId) ?? null : null;
  const rank2Team = allLeagueDone && standings[1]?.teamId ? teams.find((t) => t.id === standings[1].teamId) ?? null : null;
  const rank3Team = allLeagueDone && standings[2]?.teamId ? teams.find((t) => t.id === standings[2].teamId) ?? null : null;
  const playoffWinnerTeam = playoffMatchRaw?.winningTeamId ? teams.find((t) => t.id === playoffMatchRaw.winningTeamId) ?? null : null;

  const hydrated = await hydrateMatch(match, teams, [], rank1Team, rank2Team, rank3Team, playoffWinnerTeam);
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

  return { match: hydrated, innings: inningsWithScores, players, playerOfMatch };
}

// ---------------------------------------------------------------------------
// Standings
// ---------------------------------------------------------------------------

export async function getStandings(idOrContext?: any): Promise<StandingWithTeam[]> {
  const tournamentId = resolveTournamentId(idOrContext);
  try {
    const [standingSnap, teams] = await Promise.all([
      getDocs(query(standingsCol(), where("tournamentId", "==", tournamentId))),
      getTeams(tournamentId),
    ]);

    if (teams.length === 0) return [];
    const teamMap = new Map(teams.map((t) => [t.id, t]));

    if (standingSnap.empty) {
      if (tournamentId === TOURNAMENT_ID || tournamentId === "main") {
        const allStandingsSnap = await getDocs(standingsCol());
        const filteredDocs = allStandingsSnap.docs.filter((d) => {
          const data = d.data();
          return !data.tournamentId || data.tournamentId === "main" || data.tournamentId === TOURNAMENT_ID;
        });
        if (filteredDocs.length > 0) {
          return filteredDocs
            .map((d) => {
              const raw = d.data() as any;
              const nrr =
                typeof raw.nrr === "number" && !isNaN(raw.nrr)
                  ? raw.nrr
                  : typeof raw.netRunRate === "number" && !isNaN(raw.netRunRate)
                    ? raw.netRunRate
                    : 0;
              const s = { id: d.id, ...raw, nrr } as Standing;
              return { ...s, team: teamMap.get(s.teamId) ?? null };
            })
            .filter((s): s is StandingWithTeam => s.team !== null)
            .sort(
              (a, b) =>
                (b.points ?? 0) - (a.points ?? 0) ||
                (b.nrr ?? 0) - (a.nrr ?? 0) ||
                ((b.adminTiebreak ?? 0) - (a.adminTiebreak ?? 0)) ||
                (a.position || 0) - (b.position || 0),
            )
            .map((s, idx) => ({ ...s, position: idx + 1 }));
        }
      }

      // Synthesize clean initial standings for teams in this tournament
      return teams.map((team, idx) => ({
        id: `init_${team.id}`,
        tournamentId,
        teamId: team.id,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        noResult: 0,
        points: 0,
        nrr: 0,
        runsScored: 0,
        oversFaced: 0,
        runsConceded: 0,
        oversBowled: 0,
        adminTiebreak: 0,
        position: idx + 1,
        team,
      }));
    }

    const standings = standingSnap.docs
      .map((d) => {
        const raw = d.data() as any;
        const nrr =
          typeof raw.nrr === "number" && !isNaN(raw.nrr)
            ? raw.nrr
            : typeof raw.netRunRate === "number" && !isNaN(raw.netRunRate)
              ? raw.netRunRate
              : 0;
        const s = { id: d.id, ...raw, nrr } as Standing;
        return { ...s, team: teamMap.get(s.teamId) ?? null };
      })
      .filter((s): s is StandingWithTeam => s.team !== null)
      .sort(
        (a, b) =>
          (b.points ?? 0) - (a.points ?? 0) ||
          (b.nrr ?? 0) - (a.nrr ?? 0) ||
          ((b.adminTiebreak ?? 0) - (a.adminTiebreak ?? 0)) ||
          (a.position || 0) - (b.position || 0),
      )
      .map((s, idx) => ({ ...s, position: idx + 1 }));

    return standings;
  } catch (err) {
    console.error("Error loading standings:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Overview (home page)
// ---------------------------------------------------------------------------

export async function getOverview(idOrContext?: any) {
  const tournamentId = resolveTournamentId(idOrContext);
  const [tournament, schedule, standingsWithTeams] = await Promise.all([
    getTournament(tournamentId),
    getSchedule(tournamentId),
    getStandings(tournamentId),
  ]);
  if (!tournament) return null;

  const teams = standingsWithTeams
    .map((s) => s.team)
    .filter((t): t is Team => t !== null);

  const finalMatch = schedule.find(
    (m) => m.stage === "FINAL" && (m.status === "COMPLETED" || !!m.winningTeamId) && !!m.winningTeamId,
  ) ?? null;

  const champId = tournament.championTeamId || finalMatch?.winningTeamId || null;
  const champion = champId
    ? (teams.find((t) => t.id === champId) ??
      (finalMatch?.teamA?.id === champId
        ? finalMatch.teamA
        : finalMatch?.teamB?.id === champId
          ? finalMatch.teamB
          : null))
    : null;

  const runnerUp = finalMatch && champId
    ? (finalMatch.teamAId === champId ? finalMatch.teamB : finalMatch.teamA)
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
    runnerUp,
    finalMatch,
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

export async function getStatistics(idOrContext?: any) {
  const tournamentId = resolveTournamentId(idOrContext);
  const [schedule, teams] = await Promise.all([getSchedule(tournamentId), getTeams(tournamentId)]);
  const [batting, bowling, summary] = await Promise.all([
    getTournamentBattingStats(schedule),
    getTournamentBowlingStats(schedule),
    getTournamentSummaryStats(schedule),
  ]);
  return { batting, bowling, summary, teams };
}

// ---------------------------------------------------------------------------
// Player performance & search
// ---------------------------------------------------------------------------

export type PlayerMatchPerformance = {
  matchId: string;
  matchNumber: number;
  stage: string;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  status: string;
  opponentTeam?: Team | null;
  playerTeam?: Team | null;
  resultText?: string | null;
  isPlayerOfMatch: boolean;
  batting?: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    dismissal?: string | null;
    strikeRate: number;
    battingOrder: number;
  } | null;
  bowling?: {
    overs: string;
    balls: number;
    maidens: number;
    runs: number;
    wickets: number;
    economy: number;
    wides: number;
    noBalls: number;
  } | null;
};

export type PlayerPerformanceData = {
  player: Player;
  team: Team | null;
  teammates: Player[];
  matchesCount: number;
  potmCount: number;
  batting: {
    inningsCount: number;
    runs: number;
    balls: number;
    notOuts: number;
    outs: number;
    highestScore: number;
    highestIsOut: boolean;
    average: number | null;
    strikeRate: number;
    fours: number;
    sixes: number;
    thirties: number;
    fifties: number;
    ducks: number;
  };
  bowling: {
    inningsCount: number;
    balls: number;
    overs: string;
    maidens: number;
    runs: number;
    wickets: number;
    bestWickets: number;
    bestRuns: number;
    bestFigures: string;
    economy: number;
    average: number | null;
    strikeRate: number | null;
    threeWickets: number;
    wides: number;
    noBalls: number;
  };
  matchLogs: PlayerMatchPerformance[];
};

export async function getPlayerPerformance(
  playerId: string,
): Promise<PlayerPerformanceData | null> {
  try {
    const playerSnap = await getDoc(playerDoc(playerId));
    if (!playerSnap.exists()) return null;
    const player = { id: playerSnap.id, ...playerSnap.data() } as Player;

    const [teamSnap, teamPlayersSnap, schedule] = await Promise.all([
      getDoc(teamDoc(player.teamId)),
      getDocs(query(playersCol(), where("teamId", "==", player.teamId))),
      getSchedule(),
    ]);

    const team = teamSnap.exists()
      ? ({ id: teamSnap.id, ...teamSnap.data() } as Team)
      : null;
    const teammates = teamPlayersSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Player,
    );

    // Find all matches involving player's team
    const relevantMatches = schedule.filter(
      (m) => m.teamAId === player.teamId || m.teamBId === player.teamId,
    );
    const relevantMatchIds = relevantMatches.map((m) => m.id);

    if (relevantMatchIds.length === 0) {
      return {
        player,
        team,
        teammates,
        matchesCount: 0,
        potmCount: 0,
        batting: {
          inningsCount: 0,
          runs: 0,
          balls: 0,
          notOuts: 0,
          outs: 0,
          highestScore: 0,
          highestIsOut: false,
          average: null,
          strikeRate: 0,
          fours: 0,
          sixes: 0,
          thirties: 0,
          fifties: 0,
          ducks: 0,
        },
        bowling: {
          inningsCount: 0,
          balls: 0,
          overs: "0.0",
          maidens: 0,
          runs: 0,
          wickets: 0,
          bestWickets: 0,
          bestRuns: 0,
          bestFigures: "0/0",
          economy: 0,
          average: null,
          strikeRate: null,
          threeWickets: 0,
          wides: 0,
          noBalls: 0,
        },
        matchLogs: [],
      };
    }

    // Fetch innings and scores
    const inningsSnap = await getDocs(
      query(inningsCol(), where("matchId", "in", relevantMatchIds)),
    );
    const inningsList = inningsSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Innings,
    );
    const inningsIds = inningsList.map((i) => i.id);

    const [battingSnap, bowlingSnap] = inningsIds.length
      ? await Promise.all([
          getDocs(query(battingScoresCol(), where("inningsId", "in", inningsIds))),
          getDocs(query(bowlingScoresCol(), where("inningsId", "in", inningsIds))),
        ])
      : [{ docs: [] }, { docs: [] }];

    const battingScores = battingSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as BattingScore,
    );
    const bowlingScores = bowlingSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as BowlingScore,
    );

    // Calculate aggregated batting
    const playerBattingScores = battingScores.filter((b) => b.playerId === playerId);
    let totalRuns = 0;
    let totalBalls = 0;
    let totalFours = 0;
    let totalSixes = 0;
    let totalOuts = 0;
    let totalNotOuts = 0;
    let highestScore = 0;
    let highestIsOut = false;
    let thirties = 0;
    let fifties = 0;
    let ducks = 0;

    for (const b of playerBattingScores) {
      totalRuns += b.runs;
      totalBalls += b.balls;
      totalFours += b.fours;
      totalSixes += b.sixes;
      if (b.isOut) {
        totalOuts += 1;
        if (b.runs === 0) ducks += 1;
      } else {
        totalNotOuts += 1;
      }
      if (b.runs > highestScore) {
        highestScore = b.runs;
        highestIsOut = b.isOut;
      }
      if (b.runs >= 50) {
        fifties += 1;
      } else if (b.runs >= 30) {
        thirties += 1;
      }
    }

    // Calculate aggregated bowling
    const playerBowlingScores = bowlingScores.filter((b) => b.playerId === playerId);
    let totalBowlBalls = 0;
    let totalMaidens = 0;
    let totalConcededRuns = 0;
    let totalWickets = 0;
    let bestWickets = 0;
    let bestRuns = 0;
    let threeWickets = 0;
    let totalWides = 0;
    let totalNoBalls = 0;

    for (const b of playerBowlingScores) {
      totalBowlBalls += b.balls;
      totalMaidens += b.maidens;
      totalConcededRuns += b.runs;
      totalWickets += b.wickets;
      totalWides += b.wides;
      totalNoBalls += b.noBalls;
      if (b.wickets >= 3) threeWickets += 1;

      if (
        b.wickets > bestWickets ||
        (b.wickets === bestWickets && (bestWickets === 0 || b.runs < bestRuns))
      ) {
        bestWickets = b.wickets;
        bestRuns = b.runs;
      }
    }

    // Build chronological match logs
    const matchLogs: PlayerMatchPerformance[] = [];
    let playedMatchesCount = 0;
    let potmCount = 0;

    for (const m of relevantMatches) {
      const matchInnings = inningsList.filter((i) => i.matchId === m.id);
      const mInningsIds = matchInnings.map((i) => i.id);

      const mBat = playerBattingScores.find((b) => mInningsIds.includes(b.inningsId));
      const mBowl = playerBowlingScores.find((b) => mInningsIds.includes(b.inningsId));

      const isTeamA = m.teamAId === player.teamId;
      const opponentTeam = isTeamA ? m.teamB : m.teamA;
      const playerTeam = isTeamA ? m.teamA : m.teamB;

      const isInLineup = isTeamA
        ? m.teamAPlayingVI?.includes(playerId)
        : m.teamBPlayingVI?.includes(playerId);

      const isPOTM = m.playerOfMatchId === playerId;
      if (isPOTM) potmCount += 1;

      if (mBat || mBowl || isInLineup || m.status === "COMPLETED") {
        playedMatchesCount += 1;
      }

      matchLogs.push({
        matchId: m.id,
        matchNumber: m.matchNumber,
        stage: m.stage,
        date: m.date,
        time: m.time,
        venue: m.venue,
        status: m.status,
        opponentTeam,
        playerTeam,
        resultText: m.resultText,
        isPlayerOfMatch: isPOTM,
        batting: mBat
          ? {
              runs: mBat.runs,
              balls: mBat.balls,
              fours: mBat.fours,
              sixes: mBat.sixes,
              isOut: mBat.isOut,
              dismissal: mBat.dismissal,
              strikeRate: mBat.balls > 0 ? (mBat.runs / mBat.balls) * 100 : 0,
              battingOrder: mBat.battingOrder,
            }
          : null,
        bowling: mBowl
          ? {
              overs: `${Math.floor(mBowl.balls / 6)}.${mBowl.balls % 6}`,
              balls: mBowl.balls,
              maidens: mBowl.maidens,
              runs: mBowl.runs,
              wickets: mBowl.wickets,
              economy: mBowl.balls > 0 ? (mBowl.runs / mBowl.balls) * 6 : 0,
              wides: mBowl.wides,
              noBalls: mBowl.noBalls,
            }
          : null,
      });
    }

    const oversFull = `${Math.floor(totalBowlBalls / 6)}.${totalBowlBalls % 6}`;

    return {
      player,
      team,
      teammates,
      matchesCount: playedMatchesCount,
      potmCount,
      batting: {
        inningsCount: playerBattingScores.length,
        runs: totalRuns,
        balls: totalBalls,
        notOuts: totalNotOuts,
        outs: totalOuts,
        highestScore,
        highestIsOut,
        average: totalOuts > 0 ? totalRuns / totalOuts : null,
        strikeRate: totalBalls > 0 ? (totalRuns / totalBalls) * 100 : 0,
        fours: totalFours,
        sixes: totalSixes,
        thirties,
        fifties,
        ducks,
      },
      bowling: {
        inningsCount: playerBowlingScores.length,
        balls: totalBowlBalls,
        overs: oversFull,
        maidens: totalMaidens,
        runs: totalConcededRuns,
        wickets: totalWickets,
        bestWickets,
        bestRuns,
        bestFigures: `${bestWickets}/${bestRuns}`,
        economy: totalBowlBalls > 0 ? (totalConcededRuns / totalBowlBalls) * 6 : 0,
        average: totalWickets > 0 ? totalConcededRuns / totalWickets : null,
        strikeRate: totalWickets > 0 ? totalBowlBalls / totalWickets : null,
        threeWickets,
        wides: totalWides,
        noBalls: totalNoBalls,
      },
      matchLogs,
    };
  } catch (err) {
    console.error("Error loading player performance:", err);
    return null;
  }
}

export type PlayerSearchItem = Player & {
  teamName: string;
  teamShortName: string;
  teamLogoUrl?: string | null;
  totalRuns: number;
  totalWickets: number;
  matchesPlayed: number;
};

export async function getAllPlayersWithStats(): Promise<PlayerSearchItem[]> {
  try {
    const [playersSnap, teamsSnap, battingSnap, bowlingSnap] = await Promise.all([
      getDocs(playersCol()),
      getDocs(query(teamsCol(), where("tournamentId", "==", TOURNAMENT_ID))),
      getDocs(battingScoresCol()),
      getDocs(bowlingScoresCol()),
    ]);

    const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
    const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
    const batting = battingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BattingScore);
    const bowling = bowlingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as BowlingScore);

    return players.map((p) => {
      const team = teams.find((t) => t.id === p.teamId);
      const pBat = batting.filter((b) => b.playerId === p.id);
      const pBowl = bowling.filter((b) => b.playerId === p.id);

      const totalRuns = pBat.reduce((acc, b) => acc + b.runs, 0);
      const totalWickets = pBowl.reduce((acc, b) => acc + b.wickets, 0);
      const matchesPlayed = Math.max(pBat.length, pBowl.length);

      return {
        ...p,
        teamName: team?.name ?? "WASA Team",
        teamShortName: team?.shortName ?? "TBD",
        teamLogoUrl: team?.logoUrl ?? null,
        totalRuns,
        totalWickets,
        matchesPlayed,
      };
    });
  } catch (err) {
    console.error("Error loading all players with stats:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Admin — dashboard
// ---------------------------------------------------------------------------

export async function getAdminDashboard(tournamentId: string = TOURNAMENT_ID) {
  const [tournament, teams, players, schedule, standings] = await Promise.all([
    getTournament(tournamentId),
    getTeams(tournamentId),
    getPlayers(tournamentId),
    getSchedule(tournamentId),
    getStandings(tournamentId),
  ]);
  const summary = getTournamentSummarySync(schedule);
  const top = standings.slice(0, 2);

  const finalMatch = schedule.find(
    (m) => m.stage === "FINAL" && (m.status === "COMPLETED" || !!m.winningTeamId) && !!m.winningTeamId,
  );
  const champId = tournament?.championTeamId || finalMatch?.winningTeamId || null;
  const champion = champId
    ? (teams.find((t) => t.id === champId) ??
      (finalMatch?.teamA?.id === champId
        ? finalMatch.teamA
        : finalMatch?.teamB?.id === champId
          ? finalMatch.teamB
          : null))
    : null;

  return {
    totalTeams: teams.length,
    totalPlayers: players.length,
    champion,
    finalMatch,
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
  try {
    const snap = await getDoc(matchDoc(matchId));
    if (!snap.exists()) return null;
    const match = { id: snap.id, ...snap.data() } as Match;

    const [teams, players, inningsSnap] = await Promise.all([
      getTeams(),
      getPlayers(),
      getDocs(query(inningsCol(), where("matchId", "==", matchId))),
    ]);

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

    return {
      match,
      teams,
      players,
      innings: inningsList.map((inn) => {
        const batting = battingAll.filter((b) => b.inningsId === inn.id);
        const bowling = bowlingAll.filter((b) => b.inningsId === inn.id);
        const batRuns = batting.reduce((s, b) => s + (Number(b.runs) || 0), 0);
        const extras =
          (Number(inn.wides) || 0) +
          (Number(inn.noBalls) || 0) +
          (Number(inn.byes) || 0) +
          (Number(inn.legByes) || 0) +
          (Number(inn.penaltyRuns) || 0);
        const runs = batting.length > 0 || extras > 0 ? batRuns + extras : (Number(inn.runs) || 0);
        const wickets = batting.filter((b) => b.isOut).length;
        const balls = bowling.reduce((s, b) => s + (Number(b.balls) || 0), 0);
        return {
          ...inn,
          runs,
          wickets,
          balls,
          batting,
          bowling,
        };
      }),
    };
  } catch (err) {
    console.error("Error loading match workspace:", err);
    return null;
  }
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

    const [playersSnap, inningsSnap] = await Promise.all([
      getDocs(playersCol()),
      getDocs(query(inningsCol(), where("matchId", "==", matchId))),
    ]);

    const playersList = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);
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

    const playerName = (id: string) =>
      playersList.find((p) => p.id === id)?.name ?? "Player";

    callback({
      match,
      innings: inningsList.map((inn) => ({
        ...inn,
        batting: battingAll
          .filter((b) => b.inningsId === inn.id)
          .sort((a, b) => a.battingOrder - b.battingOrder)
          .map((b) => ({ ...b, playerName: playerName(b.playerId) })),
        bowling: bowlingAll
          .filter((b) => b.inningsId === inn.id)
          .map((b) => ({ ...b, playerName: playerName(b.playerId) })),
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

export async function getTournamentMembers(tournamentId: string): Promise<TournamentMember[]> {
  try {
    const snap = await getDocs(
      query(tournamentMembersCol(), where("tournamentId", "==", tournamentId)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TournamentMember);
  } catch (err) {
    console.error("Error loading tournament members:", err);
    return [];
  }
}
