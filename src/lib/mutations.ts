/**
 * All admin write operations (mutations) — Firestore equivalents of
 * the tRPC adminRouter mutations.
 */

import {
  addDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import {
  tournamentsCol,
  tournamentDoc,
  teamsCol,
  teamDoc,
  playersCol,
  playerDoc,
  matchesCol,
  matchDoc,
  inningsCol,
  inningsDoc,
  battingScoresCol,
  bowlingScoresCol,
  standingsCol,
  standingDoc,
  usersCol,
  userDoc,
  tournamentMembersCol,
  tournamentMemberDoc,
  tournamentTeamMembershipsCol,
  tournamentTeamMembershipDoc,
  teamChallengesCol,
  teamChallengeDoc,
  TOURNAMENT_ID,
  type Tournament,
  type TournamentMember,
  type TournamentTeamMembership,
  type TeamMembershipStatus,
  type TeamChallenge,
  type ChallengeStatus,
  type ChallengeType,
  type TournamentFormatType,
  type TournamentRole,
  type Team,
  type Player,
  type Match,
  type Innings,
  type FallOfWicket,
  type Partnership,
  type UserAccount,
  type UserRole,
  now,
} from "./firestore";
import { db } from "./firebase";
import { recalculateStandings, syncInningsTotals, finalizeMatch } from "./tournament-logic";
import { validateMatchRules } from "./match-rules-guardrails";

// ---------------------------------------------------------------------------
// Tournament
// ---------------------------------------------------------------------------

export async function createTournament(input: Partial<Tournament> & { name: string; formatType?: any }) {
  // Validate and normalize match rules according to PitchPe cricket guardrails
  const validation = validateMatchRules({
    formatPreset: input.formatType || "TAPE_BALL_INDOOR",
    oversPerSide: input.oversPerSide ?? 4,
    maxOversPerBowler: input.maxOverPerBowler ?? 1,
    playersPerTeam: input.playersPerTeam ?? 6,
    maxDismissals: input.maxWickets,
    lastManStanding: input.allowLastManStanding ?? true,
    freeHitOnNoBall: input.freeHitEnabled ?? true,
    noBallPenalty: input.noBallRuns ?? 1,
    widePenalty: input.wideRuns ?? 1,
  });

  if (!validation.valid) {
    const errorMsg = validation.errors.map((e) => e.message).join(" ");
    throw new Error(`Tournament match rules validation failed: ${errorMsg}`);
  }

  const norm = validation.normalizedRules;

  const docRef = doc(tournamentsCol());
  const tournamentId = docRef.id;
  const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const newTournament: Omit<Tournament, "id"> = {
    name: input.name,
    shortName: input.shortName || input.name.slice(0, 4).toUpperCase(),
    slug,
    description: input.description || null,
    formatType: norm.formatPreset,
    winPoints: input.winPoints ?? 2,
    tiePoints: input.tiePoints ?? 1,
    noResultPoints: input.noResultPoints ?? 1,
    lossPoints: input.lossPoints ?? 0,
    oversPerSide: norm.oversPerSide,
    maxOverPerBowler: norm.maxOversPerBowler,
    playersPerTeam: norm.playersPerTeam,
    maxWickets: norm.maxDismissals,
    allowLastManStanding: norm.lastManStanding,
    wideRuns: norm.widePenalty,
    noBallRuns: norm.noBallPenalty,
    freeHitEnabled: norm.freeHitOnNoBall,
    playoffFormat: input.playoffFormat ?? "DIRECT_TOP2",
    scorerPin: input.scorerPin || null,
    venueName: input.venueName || "Askari XI, Lahore",
    venueMapsUrl: input.venueMapsUrl || null,
    branding: input.branding || {
      primaryColor: "#10b981",
      accentColor: "#f59e0b",
      logoUrl: null,
      bannerUrl: null,
    },
    status: input.status || "UPCOMING",
    ownerId: input.ownerId || null,
    ownerEmail: input.ownerEmail ? input.ownerEmail.toLowerCase().trim() : null,
    championTeamId: null,
    createdAt: now(),
    updatedAt: now(),
  };

  await setDoc(docRef, newTournament);

  // Automatically record creator as OWNER in tournamentMembers collection
  if (input.ownerId || input.ownerEmail) {
    const memberId = `${tournamentId}_${input.ownerId || input.ownerEmail?.replace(/[^a-z0-9]/gi, "_")}`;
    const memberDocRef = doc(tournamentMembersCol(), memberId);
    await setDoc(memberDocRef, {
      tournamentId,
      userId: input.ownerId || "",
      userEmail: (input.ownerEmail || "").toLowerCase().trim(),
      userName: "Tournament Creator",
      role: "OWNER" as TournamentRole,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  return { id: tournamentId, ...newTournament };
}

export async function updateTournament(tournamentId: string, input: Partial<Tournament>) {
  await setDoc(
    tournamentDoc(tournamentId),
    {
      ...input,
      updatedAt: now(),
    },
    { merge: true },
  );
}

export async function deleteTournament(tournamentId: string) {
  // Delete tournament document and its teams, players, matches, standings, and members
  const batch = writeBatch(db);
  batch.delete(tournamentDoc(tournamentId));

  const [tTeams, tMatches, tStandings, tMembers] = await Promise.all([
    getDocs(query(teamsCol(), where("tournamentId", "==", tournamentId))),
    getDocs(query(matchesCol(), where("tournamentId", "==", tournamentId))),
    getDocs(query(standingsCol(), where("tournamentId", "==", tournamentId))),
    getDocs(query(tournamentMembersCol(), where("tournamentId", "==", tournamentId))),
  ]);

  tTeams.docs.forEach((d) => batch.delete(d.ref));
  tMatches.docs.forEach((d) => batch.delete(d.ref));
  tStandings.docs.forEach((d) => batch.delete(d.ref));
  tMembers.docs.forEach((d) => batch.delete(d.ref));

  // Also clean up match innings
  const matchIds = tMatches.docs.map((d) => d.id);
  if (matchIds.length > 0) {
    const tInnings = await getDocs(query(inningsCol(), where("matchId", "in", matchIds.slice(0, 30))));
    tInnings.docs.forEach((d) => batch.delete(d.ref));
  }

  await batch.commit();
}

export async function updateTournamentSettings(input: {
  tournamentId?: string;
  name: string;
  shortName?: string;
  winPoints: number;
  tiePoints: number;
  noResultPoints: number;
  lossPoints: number;
  oversPerSide: number;
}) {
  const tId = input.tournamentId || TOURNAMENT_ID;
  await setDoc(
    tournamentDoc(tId),
    {
      ...input,
      shortName: input.shortName ?? null,
      updatedAt: now(),
    },
    { merge: true },
  );
  await recalculateStandings(tId);
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export async function upsertTeam(input: {
  id?: string;
  tournamentId?: string;
  name: string;
  shortName: string;
  groupName: "A" | "B";
  logoUrl?: string;
  ownerId?: string | null;
  ownerEmail?: string | null;
}) {
  const tId = input.tournamentId || TOURNAMENT_ID;
  const data: Record<string, any> = {
    tournamentId: tId,
    name: input.name,
    shortName: input.shortName,
    groupName: input.groupName,
    logoUrl: input.logoUrl ?? null,
    updatedAt: now(),
  };

  if (input.ownerId !== undefined) {
    data.ownerId = input.ownerId;
  }
  if (input.ownerEmail !== undefined) {
    data.ownerEmail = input.ownerEmail ? input.ownerEmail.toLowerCase().trim() : null;
  }

  if (input.id) {
    await updateDoc(teamDoc(input.id), data);
    await recalculateStandings(tId);
    return { id: input.id, ...data };
  }

  const ref = await addDoc(teamsCol(), { ...data, createdAt: now() });
  await recalculateStandings(tId);
  return { id: ref.id, ...data };
}

export async function deleteTeam(teamId: string) {
  // Check if any match references this team
  const matchesSnap = await getDocs(
    query(matchesCol(), where("tournamentId", "==", TOURNAMENT_ID)),
  );
  const referenced = matchesSnap.docs.some((d) => {
    const m = d.data() as Match;
    return m.teamAId === teamId || m.teamBId === teamId;
  });
  if (referenced) {
    throw new Error(
      "Cannot delete this team because it is referenced by existing matches. Delete or reassign the matches first.",
    );
  }
  await deleteDoc(teamDoc(teamId));
  await deleteDoc(standingDoc(teamId));
  await recalculateStandings();
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export async function upsertPlayer(input: {
  id?: string;
  teamId: string;
  name: string;
  jerseyNumber?: number;
  role: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  designation?: "Captain" | "Vice Captain" | "Team Member";
  battingStyle?: string;
  bowlingStyle?: string;
  photoUrl?: string;
}) {
  const isCaptain =
    input.isCaptain === true || input.designation === "Captain";
  const isViceCaptain =
    input.isViceCaptain === true || input.designation === "Vice Captain";
  const designation =
    input.designation ||
    (isCaptain ? "Captain" : isViceCaptain ? "Vice Captain" : "Team Member");

  const data = {
    teamId: input.teamId,
    name: input.name,
    jerseyNumber: input.jerseyNumber ?? null,
    role: input.role,
    isCaptain,
    isViceCaptain,
    designation,
    battingStyle: input.battingStyle ?? null,
    bowlingStyle: input.bowlingStyle ?? null,
    photoUrl: input.photoUrl ?? null,
    updatedAt: now(),
  };

  if (input.id) {
    await updateDoc(playerDoc(input.id), data);
    return { id: input.id };
  }

  const ref = await addDoc(playersCol(), { ...data, createdAt: now() });
  return { id: ref.id };
}

export async function deletePlayer(playerId: string) {
  // Check if player has scorecard entries
  const [battingSnap, bowlingSnap] = await Promise.all([
    getDocs(query(battingScoresCol(), where("playerId", "==", playerId))),
    getDocs(query(bowlingScoresCol(), where("playerId", "==", playerId))),
  ]);
  if (!battingSnap.empty || !bowlingSnap.empty) {
    throw new Error("Player has scorecard entries and cannot be deleted.");
  }
  await deleteDoc(playerDoc(playerId));
}

// ---------------------------------------------------------------------------
// Match management (Create, Update, Delete, Auto-generate)
// ---------------------------------------------------------------------------

export async function createMatch(input: {
  tournamentId?: string;
  matchNumber: number;
  stage: "LEAGUE" | "PLAYOFF" | "FINAL";
  day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  teamAId?: string | null;
  teamBId?: string | null;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  oversPerSide?: number | null;
  maxOverPerBowler?: number | null;
  playersPerTeam?: number | null;
  maxWickets?: number | null;
  allowLastManStanding?: boolean | null;
  wideRuns?: number | null;
  noBallRuns?: number | null;
  freeHitEnabled?: boolean | null;
  formatType?: TournamentFormatType | null;
}) {
  const tId = input.tournamentId || TOURNAMENT_ID;

  // Retrieve tournament rules if not explicitly supplied
  let overs = input.oversPerSide;
  let maxBowler = input.maxOverPerBowler;
  let players = input.playersPerTeam;
  let wickets = input.maxWickets;
  let lms = input.allowLastManStanding;
  let wide = input.wideRuns;
  let noBall = input.noBallRuns;
  let freeHit = input.freeHitEnabled;
  let format = input.formatType;

  if (overs === undefined || maxBowler === undefined || players === undefined || wickets === undefined || lms === undefined) {
    try {
      const tSnap = await getDoc(tournamentDoc(tId));
      if (tSnap.exists()) {
        const tData = tSnap.data() as Tournament;
        overs = overs ?? tData.oversPerSide ?? 4;
        maxBowler = maxBowler ?? tData.maxOverPerBowler ?? (overs <= 5 ? 1 : 2);
        players = players ?? tData.playersPerTeam ?? 6;
        wickets = wickets ?? tData.maxWickets ?? 6;
        lms = lms ?? tData.allowLastManStanding ?? true;
        wide = wide ?? tData.wideRuns ?? 1;
        noBall = noBall ?? tData.noBallRuns ?? 1;
        freeHit = freeHit ?? tData.freeHitEnabled ?? true;
        format = format ?? tData.formatType ?? "TAPE_BALL_INDOOR";
      }
    } catch {
      // fallback
    }
  }

  const ref = await addDoc(matchesCol(), {
    tournamentId: tId,
    matchNumber: input.matchNumber,
    stage: input.stage,
    day: input.day,
    teamAId: input.teamAId ?? null,
    teamBId: input.teamBId ?? null,
    date: input.date ?? null,
    time: input.time ?? null,
    venue: input.venue ?? "Askari XI, Lahore",
    oversPerSide: overs ?? 4,
    maxOverPerBowler: maxBowler ?? 1,
    playersPerTeam: players ?? 6,
    maxWickets: wickets ?? 6,
    allowLastManStanding: lms ?? true,
    wideRuns: wide ?? 1,
    noBallRuns: noBall ?? 1,
    freeHitEnabled: freeHit ?? true,
    formatType: format ?? "TAPE_BALL_INDOOR",
    status: "UPCOMING" as const,
    tossWinnerId: null,
    tossDecision: null,
    winningTeamId: null,
    resultText: null,
    playerOfMatchId: null,
    completedAt: null,
    createdAt: now(),
    updatedAt: now(),
  });
  await recalculateStandings(tId);
  return { id: ref.id };
}

export async function deleteMatch(matchId: string) {
  // Delete associated innings and scores if any
  const inningsSnap = await getDocs(
    query(inningsCol(), where("matchId", "==", matchId)),
  );
  const batch = writeBatch(db);
  for (const innDoc of inningsSnap.docs) {
    const batSnap = await getDocs(
      query(battingScoresCol(), where("inningsId", "==", innDoc.id)),
    );
    const bowlSnap = await getDocs(
      query(bowlingScoresCol(), where("inningsId", "==", innDoc.id)),
    );
    batSnap.docs.forEach((d) => batch.delete(d.ref));
    bowlSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(innDoc.ref);
  }
  batch.delete(matchDoc(matchId));
  await batch.commit();
  await recalculateStandings();
}

export async function updateMatchDetails(input: {
  matchId: string;
  matchNumber?: number;
  stage?: "LEAGUE" | "PLAYOFF" | "FINAL";
  day?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  date?: string;
  time?: string;
  venue?: string;
  teamAId?: string | null;
  teamBId?: string | null;
}) {
  const snap = await getDoc(matchDoc(input.matchId));
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as Match;

  const set: Record<string, unknown> = {
    date: input.date ?? null,
    time: input.time ?? null,
    venue: input.venue ?? null,
    updatedAt: now(),
  };

  if (input.matchNumber !== undefined) set.matchNumber = input.matchNumber;
  if (input.stage !== undefined) set.stage = input.stage;
  if (input.day !== undefined) set.day = input.day;

  if (match.status === "UPCOMING") {
    if (input.teamAId !== undefined) set.teamAId = input.teamAId;
    if (input.teamBId !== undefined) set.teamBId = input.teamBId;
  }

  await updateDoc(matchDoc(input.matchId), set);
}

export async function autoGenerateSchedule() {
  const teamsSnap = await getDocs(
    query(teamsCol(), where("tournamentId", "==", TOURNAMENT_ID)),
  );
  const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team);
  if (teams.length < 2) {
    throw new Error("At least 2 teams are required to generate fixtures.");
  }

  // Get current max match number
  const existingMatchesSnap = await getDocs(
    query(matchesCol(), where("tournamentId", "==", TOURNAMENT_ID)),
  );
  let matchNum = existingMatchesSnap.docs.length + 1;

  // Generate round robin pairings
  const groupA = teams.filter((t) => t.groupName === "A");
  const groupB = teams.filter((t) => t.groupName === "B");

  const pairings: { teamAId: string; teamBId: string; day: "MONDAY" | "TUESDAY" }[] = [];

  if (groupA.length > 0 && groupB.length > 0) {
    // Cross-group or intra-group fixtures
    let dayToggle: "MONDAY" | "TUESDAY" = "MONDAY";
    for (let i = 0; i < groupA.length; i++) {
      for (let j = 0; j < groupB.length; j++) {
        pairings.push({
          teamAId: groupA[i].id,
          teamBId: groupB[j].id,
          day: dayToggle,
        });
        dayToggle = dayToggle === "MONDAY" ? "TUESDAY" : "MONDAY";
      }
    }
  } else {
    // Standard all-play-all
    let dayToggle: "MONDAY" | "TUESDAY" = "MONDAY";
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        pairings.push({
          teamAId: teams[i].id,
          teamBId: teams[j].id,
          day: dayToggle,
        });
        dayToggle = dayToggle === "MONDAY" ? "TUESDAY" : "MONDAY";
      }
    }
  }

  const batch = writeBatch(db);
  for (const pair of pairings) {
    const docRef = doc(matchesCol());
    batch.set(docRef, {
      tournamentId: TOURNAMENT_ID,
      matchNumber: matchNum++,
      stage: "LEAGUE" as const,
      day: pair.day,
      date: pair.day === "MONDAY" ? "24 August" : "25 August",
      time: "9:00 PM",
      venue: "Askari XI, Lahore",
      teamAId: pair.teamAId,
      teamBId: pair.teamBId,
      status: "UPCOMING" as const,
      tossWinnerId: null,
      tossDecision: null,
      winningTeamId: null,
      resultText: null,
      playerOfMatchId: null,
      completedAt: null,
      createdAt: now(),
      updatedAt: now(),
    });
  }

  // Add Playoff (Rank 2 vs Rank 3)
  const playoffDocRef = doc(matchesCol());
  batch.set(playoffDocRef, {
    tournamentId: TOURNAMENT_ID,
    matchNumber: matchNum++,
    stage: "PLAYOFF" as const,
    day: "SATURDAY" as const,
    date: "27 August",
    time: "11:45 PM",
    venue: "Askari XI, Lahore",
    teamAId: null,
    teamBId: null,
    status: "UPCOMING" as const,
    tossWinnerId: null,
    tossDecision: null,
    winningTeamId: null,
    resultText: null,
    playerOfMatchId: null,
    completedAt: null,
    createdAt: now(),
    updatedAt: now(),
  });

  // Add Grand Final (Rank 1 vs Winner of Playoff)
  const finalDocRef = doc(matchesCol());
  batch.set(finalDocRef, {
    tournamentId: TOURNAMENT_ID,
    matchNumber: matchNum,
    stage: "FINAL" as const,
    day: "SATURDAY" as const,
    date: "27 August",
    time: "12:45 AM",
    venue: "Askari XI, Lahore",
    teamAId: null,
    teamBId: null,
    status: "UPCOMING" as const,
    tossWinnerId: null,
    tossDecision: null,
    winningTeamId: null,
    resultText: null,
    playerOfMatchId: null,
    completedAt: null,
    createdAt: now(),
    updatedAt: now(),
  });

  await batch.commit();
  await recalculateStandings();
  return { count: pairings.length + 2 };
}

// ---------------------------------------------------------------------------
// Start match
// ---------------------------------------------------------------------------

export async function startMatch(input: {
  matchId: string;
  tossWinnerId: string;
  tossDecision: "BAT" | "BOWL";
  teamAPlayingVI?: string[];
  teamAReserveId?: string | null;
  teamBPlayingVI?: string[];
  teamBReserveId?: string | null;
}) {
  const snap = await getDoc(matchDoc(input.matchId));
  if (!snap.exists()) throw new Error("Match not found");
  const match = snap.data() as Match;

  if (!match.teamAId || !match.teamBId) {
    throw new Error("Both teams must be set before starting the match.");
  }
  if (match.status !== "UPCOMING") {
    throw new Error("Match has already started.");
  }

  const battingFirstId =
    input.tossDecision === "BAT"
      ? input.tossWinnerId
      : input.tossWinnerId === match.teamAId
        ? match.teamBId
        : match.teamAId;
  const bowlingFirstId =
    battingFirstId === match.teamAId ? match.teamBId : match.teamAId;

  const tossWinnerSnap = await getDoc(teamDoc(input.tossWinnerId));
  const tossWinnerName = tossWinnerSnap.exists() && tossWinnerSnap.data()?.name
    ? tossWinnerSnap.data().name
    : "Toss Winner";
  const actionText = input.tossDecision === "BAT" ? "elected to BAT first" : "elected to BOWL first";
  const tossEventText = `${tossWinnerName} won the toss and ${actionText}!`;

  await updateDoc(matchDoc(input.matchId), {
    status: "LIVE",
    tossWinnerId: input.tossWinnerId,
    tossDecision: input.tossDecision,
    recentEvent: {
      type: "TOSS",
      text: tossEventText,
      timestamp: Date.now(),
    },
    ...(input.teamAPlayingVI !== undefined ? { teamAPlayingVI: input.teamAPlayingVI } : {}),
    ...(input.teamAReserveId !== undefined ? { teamAReserveId: input.teamAReserveId } : {}),
    ...(input.teamBPlayingVI !== undefined ? { teamBPlayingVI: input.teamBPlayingVI } : {}),
    ...(input.teamBReserveId !== undefined ? { teamBReserveId: input.teamBReserveId } : {}),
    updatedAt: now(),
  });

  await addDoc(inningsCol(), {
    tournamentId: match.tournamentId || TOURNAMENT_ID,
    matchId: input.matchId,
    inningsNumber: 1 as const,
    battingTeamId: battingFirstId!,
    bowlingTeamId: bowlingFirstId!,
    runs: 0, wickets: 0, balls: 0,
    wides: 0, noBalls: 0, byes: 0, legByes: 0, penaltyRuns: 0,
    allOut: false, completed: false,
    createdAt: now(), updatedAt: now(),
  });
}

// ---------------------------------------------------------------------------
// Save innings scorecard
// ---------------------------------------------------------------------------

export async function saveInnings(input: {
  matchId: string;
  inningsNumber: 1 | 2;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penaltyRuns: number;
  batting: {
    playerId: string;
    battingOrder: number;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    dismissal?: string;
  }[];
  bowling: {
    playerId: string;
    balls: number;
    maidens: number;
    runs: number;
    wickets: number;
    wides: number;
    noBalls: number;
  }[];
  completed: boolean;
  strikerId?: string | null;
  nonStrikerId?: string | null;
  currentBowlerId?: string | null;
  recentBalls?: string[];
  fallOfWickets?: FallOfWicket[];
  partnerships?: Partnership[];
  recentEvent?: {
    type: "FOUR" | "SIX" | "WICKET" | "MAIDEN" | "TOSS";
    text?: string;
    timestamp: number;
    batterName?: string;
    bowlerName?: string;
    dismissal?: string;
  } | null;
}) {
  const matchSnap = await getDoc(matchDoc(input.matchId));
  if (!matchSnap.exists()) throw new Error("Match not found");
  const match = { id: matchSnap.id, ...matchSnap.data() } as Match;

  // Find or create innings
  const existingSnap = await getDocs(
    query(inningsCol(), where("matchId", "==", input.matchId)),
  );
  const existingList = existingSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Innings);
  let inn = existingList.find((i) => i.inningsNumber === input.inningsNumber);

  if (!inn) {
    const inn1 = existingList.find((i) => i.inningsNumber === 1);
    let battingTeamId: string;
    let bowlingTeamId: string;

    if (input.inningsNumber === 1) {
      if (!match.teamAId || !match.teamBId) throw new Error("Teams not set");
      if (match.tossWinnerId && match.tossDecision) {
        battingTeamId =
          match.tossDecision === "BAT"
            ? match.tossWinnerId
            : match.tossWinnerId === match.teamAId
              ? match.teamBId
              : match.teamAId;
        bowlingTeamId = battingTeamId === match.teamAId ? match.teamBId : match.teamAId;
      } else {
        battingTeamId = match.teamAId;
        bowlingTeamId = match.teamBId;
      }
    } else {
      if (!inn1) throw new Error("Save innings 1 first");
      battingTeamId =
        inn1.bowlingTeamId ||
        (inn1.battingTeamId === match.teamAId ? match.teamBId : match.teamAId) ||
        (match.teamBId ?? "");
      bowlingTeamId =
        inn1.battingTeamId ||
        (battingTeamId === match.teamAId ? match.teamBId : match.teamAId) ||
        (match.teamAId ?? "");
    }

    const ref = await addDoc(inningsCol(), {
      tournamentId: match.tournamentId || TOURNAMENT_ID,
      matchId: input.matchId,
      inningsNumber: input.inningsNumber,
      battingTeamId, bowlingTeamId,
      runs: 0, wickets: 0, balls: 0,
      wides: 0, noBalls: 0, byes: 0, legByes: 0, penaltyRuns: 0,
      allOut: false, completed: false,
      recentBalls: input.recentBalls ?? [],
      fallOfWickets: input.fallOfWickets ?? [],
      partnerships: input.partnerships ?? [],
      createdAt: now(), updatedAt: now(),
    });
    inn = { id: ref.id, tournamentId: match.tournamentId || TOURNAMENT_ID, matchId: input.matchId, inningsNumber: input.inningsNumber, battingTeamId, bowlingTeamId, runs: 0, wickets: 0, balls: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penaltyRuns: 0, allOut: false, completed: false, recentBalls: input.recentBalls ?? [], fallOfWickets: input.fallOfWickets ?? [], partnerships: input.partnerships ?? [], createdAt: now(), updatedAt: now() };
  }

  // Dynamic Match Configuration from match document
  const maxOvers = Number(match.oversPerSide) || 10;
  const lineupSquadCount = Math.max(
    match.teamAPlayingVI?.length || 0,
    match.teamBPlayingVI?.length || 0,
    input.batting?.length || 0,
  );
  const totalPlayersInTeam = lineupSquadCount > 0 ? lineupSquadCount : (Number(match.playersPerTeam) || 11);
  const lmsEnabled = totalPlayersInTeam >= 10 ? false : (match.allowLastManStanding ?? (totalPlayersInTeam <= 8));
  const maxWickets = Number(
    match.maxWickets && match.maxWickets > 0 && match.maxWickets !== 6 && totalPlayersInTeam >= 10
      ? 10
      : match.maxWickets && match.maxWickets > 0
        ? match.maxWickets
        : (lmsEnabled ? totalPlayersInTeam : Math.max(1, totalPlayersInTeam - 1))
  );

  // Process batting records
  let outCount = 0;
  const clampedBatting = input.batting.map((b) => {
    let isOut = b.isOut;
    if (isOut) {
      if (outCount < maxWickets) {
        outCount += 1;
      } else {
        isOut = false;
      }
    }
    return { ...b, isOut };
  });

  // Process bowling records (saving active bowlers who delivered balls/extras/runs/wickets)
  let accumulatedBalls = 0;
  const clampedBowling = input.bowling
    .filter((b) => b.balls > 0 || b.wides > 0 || b.noBalls > 0 || b.runs > 0 || b.wickets > 0)
    .map((b) => {
      let balls = Math.max(0, b.balls);
      if (accumulatedBalls + balls > maxBalls) {
        balls = Math.max(0, maxBalls - accumulatedBalls);
      }
      accumulatedBalls += balls;
      return { ...b, balls };
    });

  const isAutoCompleted =
    input.completed ||
    outCount >= maxWickets ||
    accumulatedBalls >= maxBalls;

  const inferredBattingTeamId =
    inn.battingTeamId ||
    (input.inningsNumber === 1
      ? (match.tossWinnerId && match.tossDecision
          ? (match.tossDecision === "BAT" ? match.tossWinnerId : (match.tossWinnerId === match.teamAId ? match.teamBId : match.teamAId))
          : match.teamAId)
      : (existingList.find((i) => i.inningsNumber === 1)?.bowlingTeamId || match.teamBId));

  const inferredBowlingTeamId =
    inn.bowlingTeamId ||
    (inferredBattingTeamId === match.teamAId ? match.teamBId : match.teamAId);

  const totalBatRuns = clampedBatting.reduce((s, b) => s + (Number(b.runs) || 0), 0);
  const totalExtras =
    (Number(input.wides) || 0) +
    (Number(input.noBalls) || 0) +
    (Number(input.byes) || 0) +
    (Number(input.legByes) || 0) +
    (Number(input.penaltyRuns) || 0);
  const totalRuns = totalBatRuns + totalExtras;
  const totalWickets = clampedBatting.filter((b) => b.isOut).length;
  const totalBalls = clampedBowling.reduce((s, b) => s + (Number(b.balls) || 0), 0);

  // Update innings extras + completed flag + recent deliveries + FOW & partnerships + total runs/wickets/balls
  await updateDoc(inningsDoc(inn.id), {
    tournamentId: match.tournamentId || TOURNAMENT_ID,
    ...(!inn.battingTeamId && inferredBattingTeamId ? { battingTeamId: inferredBattingTeamId } : {}),
    ...(!inn.bowlingTeamId && inferredBowlingTeamId ? { bowlingTeamId: inferredBowlingTeamId } : {}),
    ...(input.strikerId !== undefined ? { strikerId: input.strikerId } : {}),
    ...(input.nonStrikerId !== undefined ? { nonStrikerId: input.nonStrikerId } : {}),
    ...(input.currentBowlerId !== undefined ? { currentBowlerId: input.currentBowlerId } : {}),
    runs: totalRuns,
    wickets: totalWickets,
    balls: totalBalls,
    wides: input.wides,
    noBalls: input.noBalls,
    byes: input.byes,
    legByes: input.legByes,
    penaltyRuns: input.penaltyRuns,
    completed: isAutoCompleted,
    recentBalls: input.recentBalls ?? inn.recentBalls ?? [],
    ...(input.fallOfWickets !== undefined ? { fallOfWickets: input.fallOfWickets } : {}),
    ...(input.partnerships !== undefined ? { partnerships: input.partnerships } : {}),
    updatedAt: now(),
  });

  // Always touch match document so real-time listeners (Live viewer, OBS stream overlay) update immediately
  await updateDoc(matchDoc(input.matchId), {
    updatedAt: now(),
    ...(input.recentEvent !== undefined ? { recentEvent: input.recentEvent } : {}),
  });

  // Replace scorecard entries (idempotent)
  const [existingBat, existingBowl] = await Promise.all([
    getDocs(query(battingScoresCol(), where("inningsId", "==", inn.id))),
    getDocs(query(bowlingScoresCol(), where("inningsId", "==", inn.id))),
  ]);

  const batch = writeBatch(db);
  existingBat.docs.forEach((d) => batch.delete(d.ref));
  existingBowl.docs.forEach((d) => batch.delete(d.ref));

  for (const b of clampedBatting) {
    const ref = doc(battingScoresCol());
    batch.set(ref, {
      tournamentId: match.tournamentId || TOURNAMENT_ID,
      inningsId: inn.id,
      playerId: b.playerId,
      battingOrder: b.battingOrder,
      runs: b.runs,
      balls: b.balls,
      fours: b.fours,
      sixes: b.sixes,
      isOut: b.isOut,
      dismissal: b.dismissal ?? null,
    });
  }

  for (const b of clampedBowling) {
    const ref = doc(bowlingScoresCol());
    batch.set(ref, {
      tournamentId: match.tournamentId || TOURNAMENT_ID,
      inningsId: inn.id,
      playerId: b.playerId,
      balls: b.balls,
      maidens: b.maidens,
      runs: b.runs,
      wickets: b.wickets,
      wides: b.wides,
      noBalls: b.noBalls,
    });
  }

  if (match.status === "UPCOMING") {
    batch.update(matchDoc(input.matchId), { status: "LIVE", updatedAt: now() });
  }

  await batch.commit();

  const totals = await syncInningsTotals(inn.id);
  if (input.inningsNumber === 2 && isAutoCompleted) {
    await finalizeMatch(input.matchId);
  }
  return { ok: true, ...totals };
}

// ---------------------------------------------------------------------------
// Complete match
// ---------------------------------------------------------------------------

export async function completeMatch(input: {
  matchId: string;
  playerOfMatchId?: string;
}) {
  if (input.playerOfMatchId) {
    await updateDoc(matchDoc(input.matchId), {
      playerOfMatchId: input.playerOfMatchId,
      updatedAt: now(),
    });
  }
  return finalizeMatch(input.matchId);
}

// ---------------------------------------------------------------------------
// Reopen match for correction
// ---------------------------------------------------------------------------

export async function reopenMatch(matchId: string) {
  const snap = await getDoc(matchDoc(matchId));
  if (!snap.exists()) throw new Error("Match not found");
  const match = { id: snap.id, ...snap.data() } as Match;

  await updateDoc(matchDoc(matchId), {
    status: "LIVE",
    winningTeamId: null,
    resultText: null,
    completedAt: null,
    updatedAt: now(),
  });

  if (match.stage === "FINAL") {
    await updateDoc(tournamentDoc(), {
      championTeamId: null,
      updatedAt: now(),
    });
  }
  await recalculateStandings();
}

// ---------------------------------------------------------------------------
// Reset / Restart match from scratch (delete innings, scorecards, lineups)
// ---------------------------------------------------------------------------

export async function resetMatch(matchId: string) {
  const snap = await getDoc(matchDoc(matchId));
  if (!snap.exists()) throw new Error("Match not found");
  const match = { id: snap.id, ...snap.data() } as Match;

  // 1. Fetch all innings for this match (robust query + in-memory fallback)
  const [inningsSnap, allInningsSnap] = await Promise.all([
    getDocs(query(inningsCol(), where("matchId", "==", matchId))),
    getDocs(inningsCol()),
  ]);

  const targetInningsDocs = [
    ...inningsSnap.docs,
    ...allInningsSnap.docs.filter((d) => d.data().matchId === matchId),
  ];
  // Deduplicate by doc ID
  const uniqueInningsMap = new Map<string, typeof targetInningsDocs[0]>();
  for (const d of targetInningsDocs) {
    uniqueInningsMap.set(d.id, d);
  }
  const inningsIds = Array.from(uniqueInningsMap.keys());

  // 2. Fetch batting and bowling score records
  const [allBatSnap, allBowlSnap] = await Promise.all([
    getDocs(battingScoresCol()),
    getDocs(bowlingScoresCol()),
  ]);

  const matchBatDocs = allBatSnap.docs.filter((d) =>
    inningsIds.includes(d.data().inningsId),
  );
  const matchBowlDocs = allBowlSnap.docs.filter((d) =>
    inningsIds.includes(d.data().inningsId),
  );

  // 3. Batch delete all scorecards and innings docs
  const batch = writeBatch(db);

  matchBatDocs.forEach((d) => batch.delete(d.ref));
  matchBowlDocs.forEach((d) => batch.delete(d.ref));
  uniqueInningsMap.forEach((d) => batch.delete(d.ref));

  // 4. Reset match document back to clean UPCOMING state
  batch.update(matchDoc(matchId), {
    status: "UPCOMING",
    tossWinnerId: null,
    tossDecision: null,
    winningTeamId: null,
    resultText: null,
    playerOfMatchId: null,
    completedAt: null,
    teamAPlayingVI: null,
    teamAReserveId: null,
    teamBPlayingVI: null,
    teamBReserveId: null,
    updatedAt: now(),
  });

  await batch.commit();

  if (match.stage === "FINAL") {
    await updateDoc(tournamentDoc(), {
      championTeamId: null,
      updatedAt: now(),
    });
  }

  // 5. Recalculate standings so points table reflects the reset
  await recalculateStandings();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Set match status (No Result / Abandoned)
// ---------------------------------------------------------------------------

export async function setMatchStatus(input: {
  matchId: string;
  status: "UPCOMING" | "NO_RESULT" | "ABANDONED";
}) {
  const snap = await getDoc(matchDoc(input.matchId));
  if (!snap.exists()) throw new Error("Match not found");

  const extra =
    input.status === "NO_RESULT" || input.status === "ABANDONED"
      ? {
          completedAt: now(),
          resultText:
            input.status === "ABANDONED" ? "Match abandoned" : "No result",
        }
      : {};

  await updateDoc(matchDoc(input.matchId), {
    status: input.status,
    ...extra,
    updatedAt: now(),
  });
  await recalculateStandings();
}

// ---------------------------------------------------------------------------
// Match Lineups (Playing VI + 1 Reserve)
// ---------------------------------------------------------------------------

export async function updateMatchLineups(input: {
  matchId: string;
  teamAPlayingVI?: string[];
  teamAReserveId?: string | null;
  teamBPlayingVI?: string[];
  teamBReserveId?: string | null;
}) {
  await updateDoc(matchDoc(input.matchId), {
    ...(input.teamAPlayingVI !== undefined ? { teamAPlayingVI: input.teamAPlayingVI } : {}),
    ...(input.teamAReserveId !== undefined ? { teamAReserveId: input.teamAReserveId } : {}),
    ...(input.teamBPlayingVI !== undefined ? { teamBPlayingVI: input.teamBPlayingVI } : {}),
    ...(input.teamBReserveId !== undefined ? { teamBReserveId: input.teamBReserveId } : {}),
    updatedAt: now(),
  });
}

// ---------------------------------------------------------------------------
// Admin tiebreak
// ---------------------------------------------------------------------------

export async function setTiebreak(input: { teamId: string; value: number }) {
  const snap = await getDoc(standingDoc(input.teamId));
  if (snap.exists()) {
    await updateDoc(standingDoc(input.teamId), {
      adminTiebreak: input.value,
      updatedAt: now(),
    });
  } else {
    await setDoc(standingDoc(input.teamId), {
      tournamentId: TOURNAMENT_ID,
      teamId: input.teamId,
      played: 0, won: 0, lost: 0, tied: 0, noResult: 0,
      points: 0, runsFor: 0, ballsFor: 0, runsAgainst: 0, ballsAgainst: 0,
      nrr: 0, position: 0, qualified: false,
      adminTiebreak: input.value,
      updatedAt: now(),
    });
  }
  await recalculateStandings();
}

// ---------------------------------------------------------------------------
// Seed tournament
// ---------------------------------------------------------------------------

export async function seedTournament() {
  const { seedFirestore } = await import("./seed");
  return seedFirestore();
}

// ---------------------------------------------------------------------------
// User & Scorer Management
// ---------------------------------------------------------------------------

export async function upsertUser(input: {
  id?: string;
  email: string;
  name?: string;
  role: UserRole;
  createdBy?: string;
}) {
  const cleanEmail = input.email.toLowerCase().trim();
  if (!cleanEmail) throw new Error("Email is required");

  // Check if user with this email already exists when creating new
  if (!input.id) {
    const existingSnap = await getDocs(
      query(usersCol(), where("email", "==", cleanEmail)),
    );
    if (!existingSnap.empty) {
      // Update existing
      const existingDoc = existingSnap.docs[0];
      await updateDoc(userDoc(existingDoc.id), {
        name: input.name ?? null,
        role: input.role,
        updatedAt: now(),
      });
      return { id: existingDoc.id };
    }
  }

  const data = {
    email: cleanEmail,
    name: input.name ?? null,
    role: input.role,
    updatedAt: now(),
  };

  if (input.id) {
    await updateDoc(userDoc(input.id), data);
    return { id: input.id };
  }

  const ref = await addDoc(usersCol(), {
    ...data,
    createdBy: input.createdBy ?? null,
    createdAt: now(),
  });
  return { id: ref.id };
}

export async function deleteUser(userId: string) {
  await deleteDoc(userDoc(userId));
}

// ---------------------------------------------------------------------------
// Tournament-Scoped Members & Permissions (User -> Tournament Membership -> Role)
// ---------------------------------------------------------------------------

export async function inviteTournamentMember(input: {
  tournamentId: string;
  userEmail: string;
  userName?: string;
  role: TournamentRole;
  invitedBy?: string;
}) {
  const cleanEmail = input.userEmail.toLowerCase().trim();
  const memberDocId = `${input.tournamentId}_${cleanEmail.replace(/[^a-z0-9]/g, "_")}`;

  const memberData: Omit<TournamentMember, "id"> = {
    tournamentId: input.tournamentId,
    userId: cleanEmail,
    userEmail: cleanEmail,
    userName: input.userName?.trim() || cleanEmail.split("@")[0],
    role: input.role,
    invitedBy: input.invitedBy || null,
    createdAt: now(),
    updatedAt: now(),
  };

  await setDoc(tournamentMemberDoc(memberDocId), memberData, { merge: true });

  // Also ensure record in users collection so they have immediate login role
  try {
    const existingSnap = await getDocs(query(usersCol(), where("email", "==", cleanEmail)));
    if (existingSnap.empty) {
      await addDoc(usersCol(), {
        email: cleanEmail,
        name: input.userName?.trim() || cleanEmail.split("@")[0],
        role: input.role === "SCORER" ? "scorer" : "admin",
        createdBy: input.invitedBy || "Admin",
        createdAt: now(),
        updatedAt: now(),
      });
    }
  } catch (err) {
    console.warn("Could not upsert user record:", err);
  }

  return { id: memberDocId, ...memberData };
}

export async function updateTournamentMemberRole(memberId: string, role: TournamentRole) {
  await updateDoc(tournamentMemberDoc(memberId), {
    role,
    updatedAt: now(),
  });
}

export async function removeTournamentMember(memberId: string) {
  await deleteDoc(tournamentMemberDoc(memberId));
}

export async function updateTournamentScorerPin(tournamentId: string, scorerPin: string) {
  await updateDoc(tournamentDoc(tournamentId), {
    scorerPin: scorerPin.trim(),
    updatedAt: now(),
  });
}

export async function bootstrapLegacyTeamsAdmin(adminEmail = "ahsanhayat092@gmail.com", userUid?: string) {
  if (!adminEmail && !userUid) return { count: 0 };
  const cleanEmail = adminEmail.toLowerCase().trim();
  const isPlatformAdmin = cleanEmail === "ahsanhayat092@gmail.com";

  // Resolve UID for this user
  let targetUid = userUid;
  if (!targetUid && cleanEmail) {
    try {
      const userSnap = await getDocs(query(usersCol(), where("email", "==", cleanEmail)));
      if (!userSnap.empty) {
        targetUid = userSnap.docs[0].id;
      }
    } catch {}
  }
  if (!targetUid && cleanEmail) {
    targetUid = `tm_${cleanEmail.replace(/[^a-z0-9]/gi, "_")}`;
  }

  const [allTeamsSnap, allTourneysSnap, allMembersSnap] = await Promise.all([
    getDocs(teamsCol()),
    getDocs(tournamentsCol()),
    getDocs(tournamentMembersCol()),
  ]);

  // Find all tournament IDs owned/administered by this user
  const userTourneyIds = new Set<string>();
  allTourneysSnap.docs.forEach((d) => {
    const data = d.data() as Tournament;
    const matchEmail = cleanEmail && data.ownerEmail && data.ownerEmail.toLowerCase().trim() === cleanEmail;
    const matchUid = targetUid && (data.ownerId === targetUid || data.ownerId === `tm_${cleanEmail}`);
    if (matchEmail || matchUid) userTourneyIds.add(d.id);
  });

  allMembersSnap.docs.forEach((d) => {
    const data = d.data() as any;
    const matchEmail = cleanEmail && data.userEmail && data.userEmail.toLowerCase().trim() === cleanEmail;
    const matchUid = targetUid && (data.userId === targetUid || data.userId === `tm_${cleanEmail}`);
    if ((matchEmail || matchUid) && (data.role === "OWNER" || data.role === "ADMIN")) {
      if (data.tournamentId) userTourneyIds.add(data.tournamentId);
    }
  });

  const teamsToAssign = allTeamsSnap.docs.filter((d) => {
    const data = d.data() as Team;
    // For platform admin, assign any unassigned teams
    if (isPlatformAdmin && (!data.ownerEmail || !data.ownerId)) {
      return true;
    }
    // For tournament creator, assign any teams in their tournaments that don't have an owner
    if (data.tournamentId && userTourneyIds.has(data.tournamentId) && (!data.ownerEmail || !data.ownerId)) {
      return true;
    }
    return false;
  });

  if (teamsToAssign.length === 0) return { count: 0 };

  const batch = writeBatch(db);
  for (const docSnap of teamsToAssign) {
    batch.update(docSnap.ref, {
      ownerEmail: cleanEmail,
      ownerId: targetUid || `tm_${cleanEmail}`,
      updatedAt: now(),
    });
  }
  await batch.commit();
  return { count: teamsToAssign.length };
}

export async function createManagedTeam(input: {
  name: string;
  shortName: string;
  logoUrl?: string;
  city?: string;
  description?: string;
  ownerId: string;
  ownerEmail: string;
}) {
  const data = {
    name: input.name.trim(),
    shortName: input.shortName.trim().toUpperCase(),
    logoUrl: input.logoUrl?.trim() || null,
    city: input.city?.trim() || null,
    description: input.description?.trim() || null,
    ownerId: input.ownerId,
    ownerEmail: input.ownerEmail.toLowerCase().trim(),
    createdAt: now(),
    updatedAt: now(),
  };

  const ref = await addDoc(teamsCol(), data);
  return { id: ref.id, ...data };
}

export async function updateManagedTeam(input: {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  city?: string;
  description?: string;
  ownerId?: string;
  ownerEmail?: string;
}) {
  const existingSnap = await getDoc(teamDoc(input.id));
  if (!existingSnap.exists()) {
    throw new Error("Team not found.");
  }
  const existingData = existingSnap.data() as Team;
  
  // Verify authorization if ownerId/ownerEmail provided
  if (input.ownerId && existingData.ownerId && existingData.ownerId !== input.ownerId) {
    if (input.ownerEmail && existingData.ownerEmail && existingData.ownerEmail.toLowerCase().trim() !== input.ownerEmail.toLowerCase().trim()) {
      throw new Error("You are not authorized to edit this team.");
    }
  }

  const updateData: Partial<Team> = {
    name: input.name.trim(),
    shortName: input.shortName.trim().toUpperCase(),
    logoUrl: input.logoUrl !== undefined ? (input.logoUrl ? input.logoUrl.trim() : null) : existingData.logoUrl,
    city: input.city !== undefined ? (input.city ? input.city.trim() : null) : existingData.city,
    description: input.description !== undefined ? (input.description ? input.description.trim() : null) : existingData.description,
    updatedAt: now(),
  };

  await updateDoc(teamDoc(input.id), updateData);
  return { id: input.id, ...updateData };
}

export async function deleteManagedTeam(teamId: string, userEmail?: string, userUid?: string) {
  const existingSnap = await getDoc(teamDoc(teamId));
  if (!existingSnap.exists()) return;
  const existingData = existingSnap.data() as Team;

  // Authorization check
  if (userUid && existingData.ownerId && existingData.ownerId !== userUid) {
    if (userEmail && existingData.ownerEmail && existingData.ownerEmail.toLowerCase().trim() !== userEmail.toLowerCase().trim()) {
      throw new Error("You are not authorized to delete this team.");
    }
  }

  // Check if any match references this team
  const matchesSnap = await getDocs(matchesCol());
  const referenced = matchesSnap.docs.some((d) => {
    const m = d.data() as Match;
    return m.teamAId === teamId || m.teamBId === teamId;
  });
  if (referenced) {
    throw new Error(
      "Cannot delete this team because it has participated in tournament matches.",
    );
  }

  // Remove players and memberships for this team
  const [playersSnap, membershipsSnap] = await Promise.all([
    getDocs(query(playersCol(), where("teamId", "==", teamId))),
    getDocs(query(tournamentTeamMembershipsCol(), where("teamId", "==", teamId))),
  ]);

  const batch = writeBatch(db);
  playersSnap.docs.forEach((pDoc) => batch.delete(pDoc.ref));
  membershipsSnap.docs.forEach((mDoc) => batch.delete(mDoc.ref));
  batch.delete(teamDoc(teamId));
  batch.delete(standingDoc(teamId));
  await batch.commit();
}

/**
 * Team Manager submits a request to join a tournament.
 */
export async function requestJoinTournament(input: {
  tournamentId: string;
  teamId: string;
  requestedBy: string;
  squadPlayerIds?: string[];
  notes?: string;
}) {
  const membershipId = `${input.tournamentId}_${input.teamId}`;
  
  // Fetch team info for denormalized display
  const teamSnap = await getDoc(teamDoc(input.teamId));
  const teamData = teamSnap.exists() ? (teamSnap.data() as Team) : null;

  const data: Omit<TournamentTeamMembership, "id"> = {
    tournamentId: input.tournamentId,
    teamId: input.teamId,
    teamName: teamData?.name,
    teamShortName: teamData?.shortName,
    teamLogoUrl: teamData?.logoUrl,
    groupName: "A",
    status: "PENDING",
    source: "TEAM_REQUEST",
    requestedBy: input.requestedBy.toLowerCase().trim(),
    squadPlayerIds: input.squadPlayerIds || [],
    notes: input.notes?.trim() || null,
    createdAt: now(),
    updatedAt: now(),
  };

  await setDoc(tournamentTeamMembershipDoc(membershipId), data, { merge: true });
  return { id: membershipId, ...data };
}

/**
 * Tournament Organizer invites a team to their tournament.
 */
export async function inviteTeamToTournament(input: {
  tournamentId: string;
  teamId: string;
  invitedBy: string;
  groupName?: "A" | "B";
  notes?: string;
}) {
  const membershipId = `${input.tournamentId}_${input.teamId}`;

  const teamSnap = await getDoc(teamDoc(input.teamId));
  const teamData = teamSnap.exists() ? (teamSnap.data() as Team) : null;

  const data: Omit<TournamentTeamMembership, "id"> = {
    tournamentId: input.tournamentId,
    teamId: input.teamId,
    teamName: teamData?.name,
    teamShortName: teamData?.shortName,
    teamLogoUrl: teamData?.logoUrl,
    groupName: input.groupName || "A",
    status: "INVITED",
    source: "ORGANIZER_INVITE",
    invitedBy: input.invitedBy.toLowerCase().trim(),
    notes: input.notes?.trim() || null,
    createdAt: now(),
    updatedAt: now(),
  };

  await setDoc(tournamentTeamMembershipDoc(membershipId), data, { merge: true });
  return { id: membershipId, ...data };
}

/**
 * Organizer responds to a team's join request (ACCEPT or REJECT).
 */
export async function respondToTournamentRequest(input: {
  membershipId: string;
  status: "ACCEPTED" | "REJECTED";
  groupName?: "A" | "B";
}) {
  const memRef = tournamentTeamMembershipDoc(input.membershipId);
  const memSnap = await getDoc(memRef);
  if (!memSnap.exists()) {
    throw new Error("Membership request not found.");
  }
  const memData = memSnap.data() as TournamentTeamMembership;

  const updateData: Partial<TournamentTeamMembership> = {
    status: input.status,
    groupName: input.groupName || memData.groupName || "A",
    updatedAt: now(),
  };

  await updateDoc(memRef, updateData);

  if (input.status === "ACCEPTED") {
    // Recalculate standings for tournament so this team is initialized
    await recalculateStandings(memData.tournamentId);
  }

  return { id: input.membershipId, ...memData, ...updateData };
}

/**
 * Team Manager responds to an organizer's invitation (ACCEPT or DECLINE).
 */
export async function respondToTournamentInvite(input: {
  membershipId: string;
  status: "ACCEPTED" | "DECLINED";
  squadPlayerIds?: string[];
}) {
  const memRef = tournamentTeamMembershipDoc(input.membershipId);
  const memSnap = await getDoc(memRef);
  if (!memSnap.exists()) {
    throw new Error("Tournament invitation not found.");
  }
  const memData = memSnap.data() as TournamentTeamMembership;

  const updateData: Partial<TournamentTeamMembership> = {
    status: input.status,
    squadPlayerIds: input.squadPlayerIds || memData.squadPlayerIds || [],
    updatedAt: now(),
  };

  await updateDoc(memRef, updateData);

  if (input.status === "ACCEPTED") {
    await recalculateStandings(memData.tournamentId);
  }

  return { id: input.membershipId, ...memData, ...updateData };
}

/**
 * Team Manager updates the tournament squad (which players participate in this tournament).
 */
export async function updateTournamentSquad(input: {
  membershipId: string;
  squadPlayerIds: string[];
}) {
  const memRef = tournamentTeamMembershipDoc(input.membershipId);
  await updateDoc(memRef, {
    squadPlayerIds: input.squadPlayerIds,
    updatedAt: now(),
  });
}

/**
 * Team Manager withdraws/cancels an outgoing join request.
 */
export async function withdrawTournamentRequest(membershipId: string) {
  const memRef = tournamentTeamMembershipDoc(membershipId);
  await updateDoc(memRef, {
    status: "WITHDRAWN",
    updatedAt: now(),
  });
}

// ---------------------------------------------------------------------------
// Team Manager Challenges & Friendly Series Mutations
// ---------------------------------------------------------------------------

/**
 * Challenger Team Manager issues a new challenge to an opponent club.
 */
export async function createTeamChallenge(input: {
  challengerTeamId: string;
  challengerTeamName: string;
  challengerTeamShortName: string;
  challengerTeamLogoUrl?: string | null;
  challengerManagerId: string;
  challengerManagerEmail: string;

  opponentTeamId: string;
  opponentTeamName: string;
  opponentTeamShortName: string;
  opponentTeamLogoUrl?: string | null;
  opponentManagerId?: string | null;
  opponentManagerEmail?: string | null;

  challengeType: ChallengeType;
  numberOfMatches?: number;
  formatType: TournamentFormatType;
  oversPerSide: number;
  playersPerTeam: number;
  venue: string;
  proposedDate: string;
  proposedTime?: string | null;
  message?: string | null;
}): Promise<TeamChallenge> {
  const numMatches =
    input.numberOfMatches ||
    (input.challengeType === "SINGLE"
      ? 1
      : input.challengeType === "BEST_OF_3" || input.challengeType === "SERIES_3"
      ? 3
      : input.challengeType === "BEST_OF_5"
      ? 5
      : input.challengeType === "SERIES_2"
      ? 2
      : 1);

  const data: Omit<TeamChallenge, "id"> = {
    challengerTeamId: input.challengerTeamId,
    challengerTeamName: input.challengerTeamName.trim(),
    challengerTeamShortName: input.challengerTeamShortName.trim().toUpperCase(),
    challengerTeamLogoUrl: input.challengerTeamLogoUrl || null,
    challengerManagerId: input.challengerManagerId,
    challengerManagerEmail: input.challengerManagerEmail.trim().toLowerCase(),

    opponentTeamId: input.opponentTeamId,
    opponentTeamName: input.opponentTeamName.trim(),
    opponentTeamShortName: input.opponentTeamShortName.trim().toUpperCase(),
    opponentTeamLogoUrl: input.opponentTeamLogoUrl || null,
    opponentManagerId: input.opponentManagerId || null,
    opponentManagerEmail: input.opponentManagerEmail ? input.opponentManagerEmail.trim().toLowerCase() : null,

    challengeType: input.challengeType,
    numberOfMatches: numMatches,
    formatType: input.formatType,
    oversPerSide: Number(input.oversPerSide) || 4,
    playersPerTeam: Number(input.playersPerTeam) || 6,
    venue: input.venue.trim() || "Askari XI Ground, Lahore",
    proposedDate: input.proposedDate.trim(),
    proposedTime: input.proposedTime?.trim() || "19:00",
    message: input.message?.trim() || null,

    status: "PENDING",
    challengerWins: 0,
    opponentWins: 0,
    tiedMatches: 0,
    winnerTeamId: null,

    createdAt: now(),
    updatedAt: now(),
  };

  const docRef = await addDoc(teamChallengesCol(), data);
  return { id: docRef.id, ...data };
}

/**
 * Opponent Team Manager accepts a challenge:
 * - Updates challenge status to "ACCEPTED"
 * - Generates 6-digit Scorer PIN
 * - Automatically creates the match documents and friendly tournament wrapper
 */
export async function acceptTeamChallenge(challengeId: string): Promise<TeamChallenge> {
  const challengeRef = teamChallengeDoc(challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) throw new Error("Challenge not found.");

  const challenge = { id: snap.id, ...snap.data() } as TeamChallenge;
  if (challenge.status !== "PENDING") {
    throw new Error(`Challenge cannot be accepted because status is ${challenge.status}`);
  }

  // Generate 6-digit Scorer PIN
  const scorerPin = Math.floor(100000 + Math.random() * 900000).toString();
  const friendlyTourneyId = `friendly_${challengeId}`;

  // 1. Create or set friendly tournament record so public live view and scorer console work seamlessly
  const tourneyRef = tournamentDoc(friendlyTourneyId);
  await setDoc(tourneyRef, {
    name: `${challenge.challengerTeamName} vs ${challenge.opponentTeamName} Friendly Series`,
    shortName: "FRIENDLY",
    description: `Friendly bilateral series between ${challenge.challengerTeamName} and ${challenge.opponentTeamName}`,
    formatType: challenge.formatType || "TAPE_BALL_INDOOR",
    oversPerSide: challenge.oversPerSide || 4,
    playersPerTeam: challenge.playersPerTeam || 6,
    scorerPin: scorerPin,
    venueName: challenge.venue,
    winPoints: 2,
    tiePoints: 1,
    lossPoints: 0,
    noResultPoints: 1,
    status: "ONGOING",
    createdAt: now(),
    updatedAt: now(),
  });

  // 2. Create the corresponding match documents
  const matchIds: string[] = [];
  const totalMatches = challenge.numberOfMatches || 1;

  for (let i = 0; i < totalMatches; i++) {
    const matchNum = i + 1;
    const matchData: Omit<Match, "id"> = {
      tournamentId: friendlyTourneyId,
      matchNumber: matchNum,
      stage: "LEAGUE",
      day: "SUNDAY",
      date: challenge.proposedDate,
      time: challenge.proposedTime || "19:00",
      venue: challenge.venue,
      oversPerSide: challenge.oversPerSide || 4,
      maxOverPerBowler: (challenge.oversPerSide || 4) <= 5 ? 1 : 2,
      playersPerTeam: challenge.playersPerTeam || 6,
      maxWickets: challenge.playersPerTeam || 6,
      allowLastManStanding: true,
      wideRuns: 1,
      noBallRuns: 1,
      freeHitEnabled: true,
      formatType: challenge.formatType || "TAPE_BALL_INDOOR",
      status: "UPCOMING",
      teamAId: challenge.challengerTeamId,
      teamBId: challenge.opponentTeamId,
      createdAt: now(),
      updatedAt: now(),
    };

    const mRef = await addDoc(matchesCol(), matchData);
    matchIds.push(mRef.id);
  }

  // 3. Update challenge document with matchIds and Scorer PIN
  const updateData: Partial<TeamChallenge> = {
    status: "ACCEPTED",
    matchIds,
    scorerPin,
    updatedAt: now(),
  };

  await updateDoc(challengeRef, updateData);
  return { ...challenge, ...updateData };
}

/**
 * Opponent Team Manager declines a challenge.
 */
export async function declineTeamChallenge(challengeId: string, reason?: string): Promise<void> {
  const challengeRef = teamChallengeDoc(challengeId);
  await updateDoc(challengeRef, {
    status: "DECLINED",
    declineReason: reason?.trim() || null,
    updatedAt: now(),
  });
}

/**
 * Challenger Team Manager cancels / withdraws a pending challenge.
 */
export async function withdrawTeamChallenge(challengeId: string): Promise<void> {
  const challengeRef = teamChallengeDoc(challengeId);
  await updateDoc(challengeRef, {
    status: "WITHDRAWN",
    updatedAt: now(),
  });
}

/**
 * Updates series score tracker when a friendly match finishes.
 */
export async function updateChallengeSeriesScore(input: {
  challengeId: string;
  challengerWins: number;
  opponentWins: number;
  tiedMatches?: number;
  winnerTeamId?: string | null;
  status?: ChallengeStatus;
}): Promise<void> {
  const challengeRef = teamChallengeDoc(input.challengeId);
  await updateDoc(challengeRef, {
    challengerWins: input.challengerWins,
    opponentWins: input.opponentWins,
    tiedMatches: input.tiedMatches ?? 0,
    winnerTeamId: input.winnerTeamId || null,
    status: input.status || "ACCEPTED",
    updatedAt: now(),
  });
}
