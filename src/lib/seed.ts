/**
 * Seeds Firestore with the WASA Premier League tournament, 6 teams, and fixtures.
 * Idempotent: if a tournament already exists, updates basic info or seeds teams.
 */

import { getDoc, getDocs, addDoc, setDoc, query, where } from "firebase/firestore";
import {
  tournamentDoc,
  teamsCol,
  matchesCol,
  TOURNAMENT_ID,
  now,
} from "./firestore";
import { recalculateStandings } from "./tournament-logic";

const TEAM_SEED = [
  { name: "Wolves", shortName: "WOL", groupName: "A" as const },
  { name: "Lions", shortName: "LIO", groupName: "A" as const },
  { name: "Falcons", shortName: "FAL", groupName: "A" as const },
  { name: "Stallions", shortName: "STA", groupName: "B" as const },
  { name: "Dolphins", shortName: "DOL", groupName: "B" as const },
  { name: "Tigers", shortName: "TIG", groupName: "B" as const },
];

const FIXTURES: {
  matchNumber: number;
  day: "FRIDAY" | "SATURDAY" | "SUNDAY";
  date: string;
  time: string;
  venue: string;
  teamA: string;
  teamB: string;
}[] = [
  { matchNumber: 1, day: "FRIDAY", date: "26 August", time: "9:00 PM", venue: "Askari XI, Lahore", teamA: "Wolves", teamB: "Stallions" },
  { matchNumber: 2, day: "FRIDAY", date: "26 August", time: "9:45 PM", venue: "Askari XI, Lahore", teamA: "Lions", teamB: "Dolphins" },
  { matchNumber: 3, day: "FRIDAY", date: "26 August", time: "10:30 PM", venue: "Askari XI, Lahore", teamA: "Falcons", teamB: "Tigers" },
  { matchNumber: 4, day: "FRIDAY", date: "26 August", time: "11:15 PM", venue: "Askari XI, Lahore", teamA: "Wolves", teamB: "Dolphins" },
  { matchNumber: 5, day: "SATURDAY", date: "27 August", time: "9:00 PM", venue: "Askari XI, Lahore", teamA: "Lions", teamB: "Tigers" },
  { matchNumber: 6, day: "SATURDAY", date: "27 August", time: "9:45 PM", venue: "Askari XI, Lahore", teamA: "Falcons", teamB: "Stallions" },
  { matchNumber: 7, day: "SATURDAY", date: "27 August", time: "10:30 PM", venue: "Askari XI, Lahore", teamA: "Wolves", teamB: "Tigers" },
  { matchNumber: 8, day: "SATURDAY", date: "27 August", time: "11:15 PM", venue: "Askari XI, Lahore", teamA: "Lions", teamB: "Stallions" },
  { matchNumber: 9, day: "SATURDAY", date: "27 August", time: "12:00 AM", venue: "Askari XI, Lahore", teamA: "Falcons", teamB: "Dolphins" },
];

export async function seedFirestore() {
  // Check if tournament already exists
  const tournSnap = await getDoc(tournamentDoc());
  if (tournSnap.exists()) {
    const teamsSnap = await getDocs(
      query(teamsCol(), where("tournamentId", "==", TOURNAMENT_ID)),
    );
    if (!teamsSnap.empty) {
      return { seeded: false, tournamentId: TOURNAMENT_ID };
    }
  } else {
    // Create tournament singleton with WASA Premier League info
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

  // Insert teams
  const teamIdByName = new Map<string, string>();
  for (const t of TEAM_SEED) {
    const ref = await addDoc(teamsCol(), {
      tournamentId: TOURNAMENT_ID,
      name: t.name,
      shortName: t.shortName,
      groupName: t.groupName,
      logoUrl: null,
      createdAt: now(),
      updatedAt: now(),
    });
    teamIdByName.set(t.name, ref.id);
  }

  // Insert league fixtures
  for (const f of FIXTURES) {
    await addDoc(matchesCol(), {
      tournamentId: TOURNAMENT_ID,
      matchNumber: f.matchNumber,
      stage: "LEAGUE" as const,
      day: f.day,
      date: f.date,
      time: f.time,
      venue: f.venue,
      teamAId: teamIdByName.get(f.teamA)!,
      teamBId: teamIdByName.get(f.teamB)!,
      status: "UPCOMING" as const,
      tossWinnerId: null, tossDecision: null,
      winningTeamId: null, resultText: null,
      playerOfMatchId: null, completedAt: null,
      createdAt: now(), updatedAt: now(),
    });
  }

  // Insert Final placeholder
  await addDoc(matchesCol(), {
    tournamentId: TOURNAMENT_ID,
    matchNumber: 10,
    stage: "FINAL" as const,
    day: "SATURDAY" as const,
    date: "27 August",
    time: "12:45 AM",
    venue: "Askari XI, Lahore",
    teamAId: null, teamBId: null,
    status: "UPCOMING" as const,
    tossWinnerId: null, tossDecision: null,
    winningTeamId: null, resultText: null,
    playerOfMatchId: null, completedAt: null,
    createdAt: now(), updatedAt: now(),
  });

  await recalculateStandings();
  return { seeded: true, tournamentId: TOURNAMENT_ID };
}
