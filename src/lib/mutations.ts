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
  TOURNAMENT_ID,
  type Tournament,
  type Team,
  type Player,
  type Match,
  type Innings,
  type UserAccount,
  type UserRole,
  now,
} from "./firestore";
import { db } from "./firebase";
import { recalculateStandings, syncInningsTotals, finalizeMatch } from "./tournament-logic";

// ---------------------------------------------------------------------------
// Tournament
// ---------------------------------------------------------------------------

export async function updateTournamentSettings(input: {
  name: string;
  shortName?: string;
  winPoints: number;
  tiePoints: number;
  noResultPoints: number;
  lossPoints: number;
  oversPerSide: number;
}) {
  await setDoc(
    tournamentDoc(),
    {
      ...input,
      shortName: input.shortName ?? null,
      updatedAt: now(),
    },
    { merge: true },
  );
  await recalculateStandings();
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export async function upsertTeam(input: {
  id?: string;
  name: string;
  shortName: string;
  groupName: "A" | "B";
  logoUrl?: string;
}) {
  const data = {
    tournamentId: TOURNAMENT_ID,
    name: input.name,
    shortName: input.shortName,
    groupName: input.groupName,
    logoUrl: input.logoUrl ?? null,
    updatedAt: now(),
  };

  if (input.id) {
    await updateDoc(teamDoc(input.id), data);
    await recalculateStandings();
    return { id: input.id };
  }

  const ref = await addDoc(teamsCol(), { ...data, createdAt: now() });
  await recalculateStandings();
  return { id: ref.id };
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
    throw new Error("Team is referenced by fixtures and cannot be deleted.");
  }

  // Delete all players on this team
  const playersSnap = await getDocs(
    query(playersCol(), where("teamId", "==", teamId)),
  );
  const batch = writeBatch(db);
  playersSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(teamDoc(teamId));
  await batch.commit();
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
  matchNumber: number;
  stage: "LEAGUE" | "FINAL";
  day: "FRIDAY" | "SATURDAY" | "SUNDAY";
  teamAId?: string | null;
  teamBId?: string | null;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
}) {
  const ref = await addDoc(matchesCol(), {
    tournamentId: TOURNAMENT_ID,
    matchNumber: input.matchNumber,
    stage: input.stage,
    day: input.day,
    teamAId: input.teamAId ?? null,
    teamBId: input.teamBId ?? null,
    date: input.date ?? null,
    time: input.time ?? null,
    venue: input.venue ?? "Askari XI, Lahore",
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
  await recalculateStandings();
  return { id: ref.id };
}

export async function deleteMatch(matchId: string) {
  // Delete associated innings and scores if any
  const inningsSnap = await getDocs(
    query(inningsCol(), where("matchId", "==", matchId)),
  );
  const batch = writeBatch(db);
  for (const doc of inningsSnap.docs) {
    const batSnap = await getDocs(
      query(battingScoresCol(), where("inningsId", "==", doc.id)),
    );
    const bowlSnap = await getDocs(
      query(bowlingScoresCol(), where("inningsId", "==", doc.id)),
    );
    batSnap.docs.forEach((d) => batch.delete(d.ref));
    bowlSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc.ref);
  }
  batch.delete(matchDoc(matchId));
  await batch.commit();
  await recalculateStandings();
}

export async function updateMatchDetails(input: {
  matchId: string;
  matchNumber?: number;
  stage?: "LEAGUE" | "FINAL";
  day?: "FRIDAY" | "SATURDAY" | "SUNDAY";
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

  const pairings: { teamAId: string; teamBId: string; day: "FRIDAY" | "SATURDAY" }[] = [];

  if (groupA.length > 0 && groupB.length > 0) {
    // Cross-group or intra-group fixtures
    let dayToggle: "FRIDAY" | "SATURDAY" = "FRIDAY";
    for (let i = 0; i < groupA.length; i++) {
      for (let j = 0; j < groupB.length; j++) {
        pairings.push({
          teamAId: groupA[i].id,
          teamBId: groupB[j].id,
          day: dayToggle,
        });
        dayToggle = dayToggle === "FRIDAY" ? "SATURDAY" : "FRIDAY";
      }
    }
  } else {
    // Standard all-play-all
    let dayToggle: "FRIDAY" | "SATURDAY" = "FRIDAY";
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        pairings.push({
          teamAId: teams[i].id,
          teamBId: teams[j].id,
          day: dayToggle,
        });
        dayToggle = dayToggle === "FRIDAY" ? "SATURDAY" : "FRIDAY";
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
      date: pair.day === "FRIDAY" ? "26 August" : "27 August",
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

  // Add Final
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
  return { count: pairings.length + 1 };
}

// ---------------------------------------------------------------------------
// Start match
// ---------------------------------------------------------------------------

export async function startMatch(input: {
  matchId: string;
  tossWinnerId: string;
  tossDecision: "BAT" | "BOWL";
}) {
  const snap = await getDoc(matchDoc(input.matchId));
  if (!snap.exists()) throw new Error("Match not found");
  const match = { id: snap.id, ...snap.data() } as Match;

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

  await updateDoc(matchDoc(input.matchId), {
    status: "LIVE",
    tossWinnerId: input.tossWinnerId,
    tossDecision: input.tossDecision,
    updatedAt: now(),
  });

  await addDoc(inningsCol(), {
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
      battingTeamId = match.teamAId;
      bowlingTeamId = match.teamBId;
    } else {
      if (!inn1) throw new Error("Save innings 1 first");
      battingTeamId = inn1.bowlingTeamId;
      bowlingTeamId = inn1.battingTeamId;
    }

    const ref = await addDoc(inningsCol(), {
      matchId: input.matchId,
      inningsNumber: input.inningsNumber,
      battingTeamId, bowlingTeamId,
      runs: 0, wickets: 0, balls: 0,
      wides: 0, noBalls: 0, byes: 0, legByes: 0, penaltyRuns: 0,
      allOut: false, completed: false,
      createdAt: now(), updatedAt: now(),
    });
    inn = { id: ref.id, matchId: input.matchId, inningsNumber: input.inningsNumber, battingTeamId, bowlingTeamId, runs: 0, wickets: 0, balls: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0, penaltyRuns: 0, allOut: false, completed: false, createdAt: now(), updatedAt: now() };
  }

  // Update innings extras + completed flag
  await updateDoc(inningsDoc(inn.id), {
    wides: input.wides,
    noBalls: input.noBalls,
    byes: input.byes,
    legByes: input.legByes,
    penaltyRuns: input.penaltyRuns,
    completed: input.completed,
    updatedAt: now(),
  });

  // Replace scorecard entries (idempotent)
  const [existingBat, existingBowl] = await Promise.all([
    getDocs(query(battingScoresCol(), where("inningsId", "==", inn.id))),
    getDocs(query(bowlingScoresCol(), where("inningsId", "==", inn.id))),
  ]);

  const batch = writeBatch(db);
  existingBat.docs.forEach((d) => batch.delete(d.ref));
  existingBowl.docs.forEach((d) => batch.delete(d.ref));

  for (const b of input.batting) {
    const ref = doc(battingScoresCol());
    batch.set(ref, {
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

  for (const b of input.bowling) {
    const ref = doc(bowlingScoresCol());
    batch.set(ref, {
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
