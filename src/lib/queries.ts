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
  tournamentTeamMembershipsCol,
  tournamentTeamMembershipDoc,
  teamDoc,
  matchDoc,
  playerDoc,
  TOURNAMENT_ID,
  type Tournament,
  type TournamentMember,
  type TournamentTeamMembership,
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

  const map = new Map<string, Tournament>();

  // Fetch all tournaments & members in parallel
  const [allTourneys, allMembersSnap] = await Promise.all([
    getTournaments(),
    getDocs(tournamentMembersCol()),
  ]);

  for (const t of allTourneys) {
    if (
      (userUid && t.ownerId === userUid) ||
      (email && t.ownerEmail && t.ownerEmail.toLowerCase().trim() === email)
    ) {
      map.set(t.id, t);
    }
  }

  // Check member records with OWNER or ADMIN role
  const userAdminMembers = allMembersSnap.docs.filter((d) => {
    const data = d.data() as any;
    const matchEmail = email && data.userEmail && data.userEmail.toLowerCase().trim() === email;
    const matchUid = userUid && data.userId && data.userId === userUid;
    const r = ((data.role || "") as string).toUpperCase();
    const isAdminRole = r === "OWNER" || r === "ADMIN";
    return (matchEmail || matchUid) && isAdminRole;
  });

  for (const d of userAdminMembers) {
    const data = d.data() as any;
    const tId = data.tournamentId;
    if (tId && !map.has(tId)) {
      const found = allTourneys.find((t) => t.id === tId);
      if (found) {
        map.set(found.id, found);
      } else {
        try {
          const tObj = await getTournament(tId);
          if (tObj) map.set(tObj.id, tObj);
        } catch {}
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Returns strictly the tournaments a Scorer is authorized to score:
 * 1. SuperAdmin (all)
 * 2. Tournaments where user is OWNER or ADMIN
 * 3. Tournaments where user is assigned in tournamentMembers (any role or SCORER)
 * 4. Tournaments unlocked via 4-digit PIN in the current session
 */
export async function getUserScorerTournaments(
  userEmail?: string | null,
  userUid?: string | null,
  pinUnlockedTournamentIds: string[] = [],
): Promise<Tournament[]> {
  const email = userEmail?.toLowerCase().trim();
  const isSuperAdmin = email === "ahsanhayat092@gmail.com";

  if (isSuperAdmin) {
    return await getTournaments();
  }

  const map = new Map<string, Tournament>();

  // 1. Tournaments unlocked via PIN in this browser session
  if (pinUnlockedTournamentIds && pinUnlockedTournamentIds.length > 0) {
    await Promise.all(
      pinUnlockedTournamentIds.map(async (tId) => {
        if (!tId) return;
        try {
          const tObj = await getTournament(tId);
          if (tObj) map.set(tObj.id, tObj);
        } catch {}
      }),
    );
  }

  if (email || userUid) {
    // 2. Fetch all tournaments & all tournament members
    const [allTourneys, allMembersSnap] = await Promise.all([
      getTournaments(),
      getDocs(tournamentMembersCol()),
    ]);

    for (const t of allTourneys) {
      if (
        (userUid && t.ownerId === userUid) ||
        (email && t.ownerEmail && t.ownerEmail.toLowerCase().trim() === email)
      ) {
        map.set(t.id, t);
      }
    }

    // Check all member records assigned to this user
    const userMembers = allMembersSnap.docs.filter((d) => {
      const data = d.data() as any;
      const matchEmail = email && data.userEmail && data.userEmail.toLowerCase().trim() === email;
      const matchUid = userUid && data.userId && data.userId === userUid;
      return matchEmail || matchUid;
    });

    for (const d of userMembers) {
      const data = d.data() as any;
      const tId = data.tournamentId;
      if (tId && !map.has(tId)) {
        const found = allTourneys.find((t) => t.id === tId);
        if (found) {
          map.set(found.id, found);
        } else {
          try {
            const tObj = await getTournament(tId);
            if (tObj) map.set(tObj.id, tObj);
          } catch {}
        }
      }
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

  // Check tournament document directly
  const tSnap = await getDoc(tournamentDoc(tournamentId));
  if (tSnap.exists()) {
    const tData = tSnap.data() as Tournament;
    if (
      (userUid && tData.ownerId === userUid) ||
      (email && tData.ownerEmail && tData.ownerEmail.toLowerCase().trim() === email)
    ) {
      return { canManage: true, isOwner: true, role: "OWNER" };
    }
  }

  // Check tournamentMembers collection by email and userId
  const memberPromises: Promise<any>[] = [];
  if (email) {
    memberPromises.push(
      getDocs(
        query(
          tournamentMembersCol(),
          where("tournamentId", "==", tournamentId),
          where("userEmail", "==", email),
        ),
      ),
    );
  }
  if (userUid) {
    memberPromises.push(
      getDocs(
        query(
          tournamentMembersCol(),
          where("tournamentId", "==", tournamentId),
          where("userId", "==", userUid),
        ),
      ),
    );
  }

  const memberSnaps = await Promise.all(memberPromises);
  for (const snap of memberSnaps) {
    if (!snap.empty) {
      const member = snap.docs[0].data() as any;
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
  
  // 1. Direct tournament teams
  const snap = await getDocs(
    query(teamsCol(), where("tournamentId", "==", tournamentId)),
  );
  const directTeams: Team[] = !snap.empty
    ? snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team)
    : [];

  // 2. Teams joined via accepted tournament memberships
  let membershipTeams: Team[] = [];
  try {
    const memSnap = await getDocs(
      query(
        tournamentTeamMembershipsCol(),
        where("tournamentId", "==", tournamentId),
        where("status", "==", "ACCEPTED"),
      ),
    );
    if (!memSnap.empty) {
      const teamFetches = memSnap.docs.map(async (mDoc) => {
        const mData = mDoc.data() as TournamentTeamMembership;
        // If already in directTeams, skip fetch
        if (directTeams.some((t) => t.id === mData.teamId)) return null;
        const tSnap = await getDoc(teamDoc(mData.teamId));
        if (tSnap.exists()) {
          const tData = { id: tSnap.id, ...tSnap.data() } as Team;
          if (mData.groupName) {
            tData.groupName = mData.groupName;
          }
          return tData;
        } else if (mData.teamName) {
          // Construct fallback team object from membership
          return {
            id: mData.teamId,
            tournamentId,
            name: mData.teamName,
            shortName: mData.teamShortName || mData.teamName.slice(0, 3).toUpperCase(),
            groupName: mData.groupName || "A",
            logoUrl: mData.teamLogoUrl || null,
            createdAt: mData.createdAt,
            updatedAt: mData.updatedAt,
          } as Team;
        }
        return null;
      });
      const resolved = await Promise.all(teamFetches);
      membershipTeams = resolved.filter((t): t is Team => t !== null);
    }
  } catch (err) {
    console.warn("Could not query tournament team memberships:", err);
  }

  const combined = [...directTeams, ...membershipTeams];
  const uniqueMap = new Map<string, Team>();
  for (const t of combined) {
    if (!uniqueMap.has(t.id)) {
      uniqueMap.set(t.id, t);
    }
  }
  const result = Array.from(uniqueMap.values());
  if (result.length > 0) return result;

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
  const tournamentId = resolveTournamentId(idOrContext);

  // Find teams for this tournament
  const teams = await getTeams(tournamentId);
  if (teams.length === 0) return [];
  const teamIds = new Set(teams.map((t) => t.id));

  const snap = await getDocs(playersCol());
  const allDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);

  if (tournamentId === TOURNAMENT_ID || tournamentId === "main") {
    return allDocs.filter(
      (p) =>
        (p.tournamentId === "main" || !p.tournamentId || p.tournamentId === TOURNAMENT_ID) &&
        p.teamId &&
        teamIds.has(p.teamId),
    );
  }

  // For custom tournaments, strictly match tournamentId or teamIds belonging to this tournament
  return allDocs.filter(
    (p) =>
      (p.tournamentId === tournamentId) ||
      (p.teamId && teamIds.has(p.teamId)),
  );
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
  tournamentId?: string;
  tournamentName?: string;
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

export type PlayerBattingAggregate = {
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

export type PlayerBowlingAggregate = {
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

export type PlayerTournamentStat = {
  tournamentId: string;
  tournamentName: string;
  matchesCount: number;
  potmCount: number;
  batting: PlayerBattingAggregate;
  bowling: PlayerBowlingAggregate;
};

export type PlayerTeamStat = {
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamLogoUrl?: string | null;
  matchesCount: number;
  batting: PlayerBattingAggregate;
  bowling: PlayerBowlingAggregate;
};

export type PlayerPerformanceData = {
  player: Player;
  team: Team | null;
  teammates: Player[];
  matchesCount: number;
  potmCount: number;
  batting: PlayerBattingAggregate;
  bowling: PlayerBowlingAggregate;
  tournamentStats: PlayerTournamentStat[];
  teamStats: PlayerTeamStat[];
  matchLogs: PlayerMatchPerformance[];
};

function computeBattingStats(scores: BattingScore[]): PlayerBattingAggregate {
  let runs = 0;
  let balls = 0;
  let fours = 0;
  let sixes = 0;
  let outs = 0;
  let notOuts = 0;
  let highestScore = 0;
  let highestIsOut = false;
  let thirties = 0;
  let fifties = 0;
  let ducks = 0;

  for (const b of scores) {
    runs += b.runs || 0;
    balls += b.balls || 0;
    fours += b.fours || 0;
    sixes += b.sixes || 0;
    if (b.isOut) {
      outs += 1;
      if (b.runs === 0) ducks += 1;
    } else {
      notOuts += 1;
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

  return {
    inningsCount: scores.length,
    runs,
    balls,
    notOuts,
    outs,
    highestScore,
    highestIsOut,
    average: outs > 0 ? runs / outs : null,
    strikeRate: balls > 0 ? (runs / balls) * 100 : 0,
    fours,
    sixes,
    thirties,
    fifties,
    ducks,
  };
}

function computeBowlingStats(scores: BowlingScore[]): PlayerBowlingAggregate {
  let balls = 0;
  let maidens = 0;
  let runs = 0;
  let wickets = 0;
  let bestWickets = 0;
  let bestRuns = 0;
  let threeWickets = 0;
  let wides = 0;
  let noBalls = 0;

  for (const b of scores) {
    balls += b.balls || 0;
    maidens += b.maidens || 0;
    runs += b.runs || 0;
    wickets += b.wickets || 0;
    wides += b.wides || 0;
    noBalls += b.noBalls || 0;
    if (b.wickets >= 3) threeWickets += 1;

    if (
      b.wickets > bestWickets ||
      (b.wickets === bestWickets && (bestWickets === 0 || b.runs < bestRuns))
    ) {
      bestWickets = b.wickets;
      bestRuns = b.runs;
    }
  }

  const overs = `${Math.floor(balls / 6)}.${balls % 6}`;
  return {
    inningsCount: scores.length,
    balls,
    overs,
    maidens,
    runs,
    wickets,
    bestWickets,
    bestRuns,
    bestFigures: `${bestWickets}/${bestRuns}`,
    economy: balls > 0 ? (runs / balls) * 6 : 0,
    average: wickets > 0 ? runs / wickets : null,
    strikeRate: wickets > 0 ? balls / wickets : null,
    threeWickets,
    wides,
    noBalls,
  };
}

export async function getPlayerPerformance(
  playerId: string,
): Promise<PlayerPerformanceData | null> {
  try {
    const playerSnap = await getDoc(playerDoc(playerId));
    if (!playerSnap.exists()) return null;
    const player = { id: playerSnap.id, ...playerSnap.data() } as Player;

    // Load reference datasets in parallel
    const [allTournaments, allTeamsSnap, allPlayersSnap, allMatches] = await Promise.all([
      getTournaments(),
      getDocs(teamsCol()),
      getDocs(playersCol()),
      getSchedule(),
    ]);

    const allTeams = allTeamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
    const allPlayers = allPlayersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Player);

    // Identify all player alias records across other teams/tournaments (matching id or email or exact name)
    const cleanName = player.name.trim().toLowerCase();
    const cleanEmail = player.email?.trim().toLowerCase();
    const aliasPlayers = allPlayers.filter((p) => {
      if (p.id === playerId) return true;
      if (cleanEmail && p.email && p.email.trim().toLowerCase() === cleanEmail) return true;
      if (cleanName && p.name.trim().toLowerCase() === cleanName) return true;
      return false;
    });

    const playerIds = Array.from(new Set(aliasPlayers.map((p) => p.id)));
    const playerTeamIds = Array.from(new Set(aliasPlayers.map((p) => p.teamId).filter(Boolean)));

    // Primary team and teammates
    const team = allTeams.find((t) => t.id === player.teamId) ?? null;
    const teammates = allPlayers.filter((p) => p.teamId === player.teamId);

    // Fetch all batting & bowling scores for this player across all matches
    const [allBattingSnap, allBowlingSnap] = await Promise.all([
      getDocs(battingScoresCol()),
      getDocs(bowlingScoresCol()),
    ]);

    const allBattingScores = allBattingSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as BattingScore)
      .filter((b) => playerIds.includes(b.playerId));

    const allBowlingScores = allBowlingSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as BowlingScore)
      .filter((b) => playerIds.includes(b.playerId));

    const battingInningsIds = allBattingScores.map((b) => b.inningsId);
    const bowlingInningsIds = allBowlingScores.map((b) => b.inningsId);
    const involvedInningsIds = Array.from(new Set([...battingInningsIds, ...bowlingInningsIds]));

    // Fetch innings to link to matches
    const allInningsSnap = await getDocs(inningsCol());
    const allInnings = allInningsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings);

    const involvedMatchIds = new Set<string>();
    for (const inn of allInnings) {
      if (involvedInningsIds.includes(inn.id)) {
        involvedMatchIds.add(inn.matchId);
      }
    }

    // Match list where player participated or where their teams played
    const relevantMatches = allMatches.filter((m) => {
      if (involvedMatchIds.has(m.id)) return true;
      if (playerIds.some((pid) => m.teamAPlayingVI?.includes(pid) || m.teamBPlayingVI?.includes(pid))) {
        return true;
      }
      if (playerTeamIds.includes(m.teamAId) || playerTeamIds.includes(m.teamBId)) {
        return true;
      }
      return false;
    });

    // Build Match Logs
    const matchLogs: PlayerMatchPerformance[] = [];
    let potmCount = 0;
    let playedMatchesCount = 0;

    for (const m of relevantMatches) {
      const matchInnings = allInnings.filter((i) => i.matchId === m.id);
      const mInningsIds = matchInnings.map((i) => i.id);

      const mBat = allBattingScores.find((b) => mInningsIds.includes(b.inningsId));
      const mBowl = allBowlingScores.find((b) => mInningsIds.includes(b.inningsId));

      // Determine which team the player played for in this match
      let playerTeamObj = team;
      let opponentTeamObj: Team | null = null;

      if (playerTeamIds.includes(m.teamAId)) {
        playerTeamObj = allTeams.find((t) => t.id === m.teamAId) || team;
        opponentTeamObj = allTeams.find((t) => t.id === m.teamBId) || null;
      } else if (playerTeamIds.includes(m.teamBId)) {
        playerTeamObj = allTeams.find((t) => t.id === m.teamBId) || team;
        opponentTeamObj = allTeams.find((t) => t.id === m.teamAId) || null;
      } else {
        // Infer from batting innings
        if (mBat) {
          const inn = matchInnings.find((i) => i.id === mBat.inningsId);
          if (inn) {
            playerTeamObj = allTeams.find((t) => t.id === inn.battingTeamId) || team;
            opponentTeamObj = allTeams.find((t) => t.id === inn.bowlingTeamId) || null;
          }
        }
      }

      const isPOTM = playerIds.includes(m.playerOfMatchId || "");
      if (isPOTM) potmCount += 1;

      const isInLineup =
        playerIds.some((pid) => m.teamAPlayingVI?.includes(pid) || m.teamBPlayingVI?.includes(pid));

      if (mBat || mBowl || isInLineup || m.status === "COMPLETED") {
        playedMatchesCount += 1;
      }

      const matchTourney =
        allTournaments.find((t) => t.id === m.tournamentId) ||
        (m.tournamentId === "main" ? { name: "WASA Premier League" } : null);

      matchLogs.push({
        matchId: m.id,
        matchNumber: m.matchNumber,
        stage: m.stage,
        tournamentId: m.tournamentId || "main",
        tournamentName: matchTourney?.name || "Premier Tournament",
        date: m.date,
        time: m.time,
        venue: m.venue,
        status: m.status,
        opponentTeam: opponentTeamObj,
        playerTeam: playerTeamObj,
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

    // Overall aggregate stats
    const overallBatting = computeBattingStats(allBattingScores);
    const overallBowling = computeBowlingStats(allBowlingScores);

    // Tournament-wise Breakdown
    const tournamentGroups = new Map<string, { matches: PlayerMatchPerformance[]; bat: BattingScore[]; bowl: BowlingScore[]; name: string }>();

    for (const log of matchLogs) {
      const tourneyId = log.tournamentId || "main";
      if (!tournamentGroups.has(tourneyId)) {
        tournamentGroups.set(tourneyId, {
          matches: [],
          bat: [],
          bowl: [],
          name: log.tournamentName || "Tournament",
        });
      }
      const grp = tournamentGroups.get(tourneyId)!;
      grp.matches.push(log);
    }

    // Add batting/bowling scores to tournament groups
    for (const b of allBattingScores) {
      const inn = allInnings.find((i) => i.id === b.inningsId);
      const m = inn ? allMatches.find((match) => match.id === inn.matchId) : null;
      const tId = m?.tournamentId || "main";
      if (tournamentGroups.has(tId)) {
        tournamentGroups.get(tId)!.bat.push(b);
      }
    }

    for (const b of allBowlingScores) {
      const inn = allInnings.find((i) => i.id === b.inningsId);
      const m = inn ? allMatches.find((match) => match.id === inn.matchId) : null;
      const tId = m?.tournamentId || "main";
      if (tournamentGroups.has(tId)) {
        tournamentGroups.get(tId)!.bowl.push(b);
      }
    }

    const tournamentStats: PlayerTournamentStat[] = Array.from(tournamentGroups.entries()).map(([tId, grp]) => {
      return {
        tournamentId: tId,
        tournamentName: grp.name,
        matchesCount: grp.matches.length,
        potmCount: grp.matches.filter((m) => m.isPlayerOfMatch).length,
        batting: computeBattingStats(grp.bat),
        bowling: computeBowlingStats(grp.bowl),
      };
    });

    // Team-wise Breakdown
    const teamGroups = new Map<string, { matches: PlayerMatchPerformance[]; bat: BattingScore[]; bowl: BowlingScore[]; teamObj: Team | null }>();

    for (const log of matchLogs) {
      const tId = log.playerTeam?.id || player.teamId || "unknown";
      if (!teamGroups.has(tId)) {
        teamGroups.set(tId, {
          matches: [],
          bat: [],
          bowl: [],
          teamObj: log.playerTeam || team,
        });
      }
      teamGroups.get(tId)!.matches.push(log);
    }

    // If player has a current team with 0 matches yet, make sure it's in teamGroups
    if (team && !teamGroups.has(team.id)) {
      teamGroups.set(team.id, {
        matches: [],
        bat: [],
        bowl: [],
        teamObj: team,
      });
    }

    for (const b of allBattingScores) {
      const inn = allInnings.find((i) => i.id === b.inningsId);
      const tId = inn?.battingTeamId || player.teamId;
      if (tId && teamGroups.has(tId)) {
        teamGroups.get(tId)!.bat.push(b);
      }
    }

    for (const b of allBowlingScores) {
      const inn = allInnings.find((i) => i.id === b.inningsId);
      const tId = inn?.bowlingTeamId || player.teamId;
      if (tId && teamGroups.has(tId)) {
        teamGroups.get(tId)!.bowl.push(b);
      }
    }

    const teamStats: PlayerTeamStat[] = Array.from(teamGroups.entries()).map(([tId, grp]) => {
      const tObj = grp.teamObj || allTeams.find((t) => t.id === tId);
      return {
        teamId: tId,
        teamName: tObj?.name || "Cricket Club",
        teamShortName: tObj?.shortName || "CC",
        teamLogoUrl: tObj?.logoUrl ?? null,
        matchesCount: grp.matches.length,
        batting: computeBattingStats(grp.bat),
        bowling: computeBowlingStats(grp.bowl),
      };
    });

    return {
      player,
      team,
      teammates,
      matchesCount: Math.max(playedMatchesCount, matchLogs.length),
      potmCount,
      batting: overallBatting,
      bowling: overallBowling,
      tournamentStats,
      teamStats,
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
      getDocs(teamsCol()),
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
        teamName: team?.name ?? "Cricket Club",
        teamShortName: team?.shortName ?? "CC",
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

// ---------------------------------------------------------------------------
// Team Manager & Tournament Team Memberships
// ---------------------------------------------------------------------------

export async function getAllTeams(): Promise<Team[]> {
  try {
    const snap = await getDocs(teamsCol());
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
  } catch (err) {
    console.error("Error loading all teams:", err);
    return [];
  }
}

export async function getUserManagedTeams(
  userEmail?: string | null,
  userUid?: string | null,
): Promise<Team[]> {
  if (!userEmail && !userUid) return [];
  try {
    const allSnap = await getDocs(teamsCol());
    const allTeams = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);

    const cleanEmail = userEmail?.toLowerCase().trim();
    const isPlatformAdmin = cleanEmail === "ahsanhayat092@gmail.com";

    // For the platform administrator account, return all existing teams as their managed teams
    if (isPlatformAdmin) {
      return allTeams;
    }

    return allTeams.filter((t) => {
      const matchEmail = cleanEmail && t.ownerEmail?.toLowerCase().trim() === cleanEmail;
      const matchUid = userUid && t.ownerId === userUid;
      return matchEmail || matchUid;
    });
  } catch (err) {
    console.error("Error loading user managed teams:", err);
    return [];
  }
}

export async function getTournamentTeamMemberships(
  tournamentId: string,
): Promise<TournamentTeamMembership[]> {
  try {
    const snap = await getDocs(
      query(tournamentTeamMembershipsCol(), where("tournamentId", "==", tournamentId)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TournamentTeamMembership);
  } catch (err) {
    console.error("Error loading tournament team memberships:", err);
    return [];
  }
}

export async function getTeamTournamentMemberships(
  teamId: string,
): Promise<TournamentTeamMembership[]> {
  try {
    const snap = await getDocs(
      query(tournamentTeamMembershipsCol(), where("teamId", "==", teamId)),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TournamentTeamMembership);
  } catch (err) {
    console.error("Error loading team tournament memberships:", err);
    return [];
  }
}

export type TeamMembershipWithTournament = TournamentTeamMembership & {
  tournament: Tournament | null;
};

export async function getTeamMembershipsWithDetails(
  teamId: string,
): Promise<TeamMembershipWithTournament[]> {
  try {
    const memberships = await getTeamTournamentMemberships(teamId);
    if (memberships.length === 0) return [];

    const tournamentsSnap = await getDocs(tournamentsCol());
    const tournamentsMap = new Map<string, Tournament>();
    for (const doc of tournamentsSnap.docs) {
      tournamentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Tournament);
    }

    return memberships.map((m) => ({
      ...m,
      tournament: tournamentsMap.get(m.tournamentId) || null,
    }));
  } catch (err) {
    console.error("Error loading team memberships with details:", err);
    return [];
  }
}

export async function getOpenTournaments(): Promise<Tournament[]> {
  try {
    const snap = await getDocs(tournamentsCol());
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tournament);
    // Include all active/upcoming tournaments
    return list.filter((t) => t.status !== "COMPLETED");
  } catch (err) {
    console.error("Error loading open tournaments:", err);
    return [];
  }
}
