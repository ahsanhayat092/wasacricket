/**
 * Firestore data model types and collection references.
 *
 * All IDs are Firestore auto-generated string document IDs.
 * The tournament is a singleton document at tournaments/main.
 */

import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tournament = {
  id: string;
  name: string;
  shortName?: string | null;
  winPoints: number;
  tiePoints: number;
  noResultPoints: number;
  lossPoints: number;
  oversPerSide: number;
  championTeamId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Team = {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string;
  groupName: "A" | "B";
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Player = {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber?: number | null;
  role: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
  battingStyle?: string | null;
  bowlingStyle?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "ABANDONED" | "NO_RESULT";
export type MatchStage = "LEAGUE" | "FINAL";
export type MatchDay = "FRIDAY" | "SATURDAY" | "SUNDAY";

export type Match = {
  id: string;
  tournamentId: string;
  matchNumber: number;
  stage: MatchStage;
  day: MatchDay;
  teamAId?: string | null;
  teamBId?: string | null;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  status: MatchStatus;
  tossWinnerId?: string | null;
  tossDecision?: "BAT" | "BOWL" | null;
  winningTeamId?: string | null;
  resultText?: string | null;
  playerOfMatchId?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Innings = {
  id: string;
  matchId: string;
  inningsNumber: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  balls: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penaltyRuns: number;
  allOut: boolean;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BattingScore = {
  id: string;
  inningsId: string;
  playerId: string;
  battingOrder: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string | null;
};

export type BowlingScore = {
  id: string;
  inningsId: string;
  playerId: string;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
};

export type Standing = {
  id: string; // same as teamId
  tournamentId: string;
  teamId: string;
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
  nrr: number;
  position: number;
  qualified: boolean;
  adminTiebreak: number;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Hydrated (joined) types used by the frontend
// ---------------------------------------------------------------------------

export type HydratedMatch = Match & {
  teamA: Team | null;
  teamB: Team | null;
  tossWinner: Team | null;
  winningTeam: Team | null;
};

export type InningsWithScores = Innings & {
  batting: (BattingScore & { playerName: string })[];
  bowling: (BowlingScore & { playerName: string })[];
};

export type StandingWithTeam = Standing & { team: Team | null };

// ---------------------------------------------------------------------------
// Collection references
// ---------------------------------------------------------------------------

function typedCollection<T = DocumentData>(path: string): CollectionReference<T> {
  return collection(db, path) as CollectionReference<T>;
}

function typedDoc<T = DocumentData>(path: string, ...segments: string[]): DocumentReference<T> {
  return doc(db, path, ...segments) as DocumentReference<T>;
}

export type UserRole = "admin" | "scorer";

export type UserAccount = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
};

export const TOURNAMENT_ID = "main";

export const tournamentDoc = () => typedDoc<Omit<Tournament, "id">>("tournaments", TOURNAMENT_ID);
export const teamsCol = () => typedCollection<Omit<Team, "id">>("teams");
export const playersCol = () => typedCollection<Omit<Player, "id">>("players");
export const matchesCol = () => typedCollection<Omit<Match, "id">>("matches");
export const inningsCol = () => typedCollection<Omit<Innings, "id">>("innings");
export const battingScoresCol = () => typedCollection<Omit<BattingScore, "id">>("battingScores");
export const bowlingScoresCol = () => typedCollection<Omit<BowlingScore, "id">>("bowlingScores");
export const standingsCol = () => typedCollection<Omit<Standing, "id">>("standings");
export const usersCol = () => typedCollection<Omit<UserAccount, "id">>("users");

// Individual doc refs
export const teamDoc = (id: string) => typedDoc<Omit<Team, "id">>("teams", id);
export const playerDoc = (id: string) => typedDoc<Omit<Player, "id">>("players", id);
export const matchDoc = (id: string) => typedDoc<Omit<Match, "id">>("matches", id);
export const inningsDoc = (id: string) => typedDoc<Omit<Innings, "id">>("innings", id);
export const standingDoc = (id: string) => typedDoc<Omit<Standing, "id">>("standings", id);
export const userDoc = (id: string) => typedDoc<Omit<UserAccount, "id">>("users", id);

/** Snap helper: converts a Firestore DocumentSnapshot to a typed object with id. */
export function snapToDoc<T extends { id: string }>(
  snap: { id: string; data(): Omit<T, "id"> | undefined },
): T | null {
  const data = snap.data();
  if (!data) return null;
  return { id: snap.id, ...data } as T;
}

export function now(): string {
  return new Date().toISOString();
}
