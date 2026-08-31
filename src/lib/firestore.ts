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

export type TournamentFormatType = "T20" | "T10" | "ODI" | "TEST" | "TAPE_BALL_INDOOR" | "CUSTOM";
export type PlayoffFormatType = "DIRECT_TOP2" | "PAGE_PLAYOFF_TOP3" | "IPL_TOP4" | "SEMI_FINALS" | "NONE";
export type TournamentStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "DRAFT";

export type TournamentBranding = {
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  sponsorLogos?: string[];
};

export type Tournament = {
  id: string;
  slug?: string;
  name: string;
  shortName?: string | null;
  description?: string | null;
  formatType?: TournamentFormatType;
  winPoints: number;
  tiePoints: number;
  noResultPoints: number;
  lossPoints: number;
  oversPerSide: number;
  maxOverPerBowler?: number;
  playersPerTeam?: number;
  maxWickets?: number;
  allowLastManStanding?: boolean;
  wideRuns?: number;
  noBallRuns?: number;
  freeHitEnabled?: boolean;
  playoffFormat?: PlayoffFormatType;
  scorerPin?: string | null;
  venueName?: string | null;
  venueMapsUrl?: string | null;
  branding?: TournamentBranding;
  status?: TournamentStatus;
  ownerId?: string | null;
  ownerEmail?: string | null;
  championTeamId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeamRole = "TEAM_MANAGER" | "CAPTAIN" | "VICE_CAPTAIN" | "PLAYER";

export type Team = {
  id: string;
  tournamentId?: string; // Optional for multi-tournament / standalone teams
  name: string;
  shortName: string;
  groupName?: "A" | "B";
  logoUrl?: string | null;
  ownerId?: string | null; // UID of the team creator / Team Manager
  ownerEmail?: string | null;
  city?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Player = {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber?: number | null;
  role: "Batsman" | "Bowler" | "All-rounder" | "Wicketkeeper";
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  designation?: "Captain" | "Vice Captain" | "Team Member";
  battingStyle?: string | null;
  bowlingStyle?: string | null;
  photoUrl?: string | null;
  email?: string | null;
  tournamentIds?: string[];
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Team <-> Tournament Participation / Request / Invitation Relationship
// ---------------------------------------------------------------------------
export type TeamMembershipStatus =
  | "PENDING"
  | "INVITED"
  | "ACCEPTED"
  | "REJECTED"
  | "DECLINED"
  | "WITHDRAWN";

export type TeamMembershipSource = "ORGANIZER_INVITE" | "TEAM_REQUEST";

export type TournamentTeamMembership = {
  id: string;
  tournamentId: string;
  teamId: string;
  teamName?: string;
  teamShortName?: string;
  teamLogoUrl?: string | null;
  groupName?: "A" | "B";
  status: TeamMembershipStatus;
  source: TeamMembershipSource;
  requestedBy?: string | null; // Team manager email/uid
  invitedBy?: string | null; // Organizer email/uid
  squadPlayerIds?: string[]; // IDs of players selected for this tournament squad
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Team Manager Challenges & Friendly Matches / Bilateral Series
// ---------------------------------------------------------------------------
export type ChallengeStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "COMPLETED";
export type ChallengeType = "SINGLE" | "BEST_OF_3" | "BEST_OF_5" | "SERIES_2" | "SERIES_3";

export type TeamChallenge = {
  id: string;
  // Challenger Club Details
  challengerTeamId: string;
  challengerTeamName: string;
  challengerTeamShortName: string;
  challengerTeamLogoUrl?: string | null;
  challengerManagerId: string;
  challengerManagerEmail: string;

  // Opponent Club Details
  opponentTeamId: string;
  opponentTeamName: string;
  opponentTeamShortName: string;
  opponentTeamLogoUrl?: string | null;
  opponentManagerId?: string | null;
  opponentManagerEmail?: string | null;

  // Match / Series Parameters
  challengeType: ChallengeType;
  numberOfMatches: number;
  formatType: TournamentFormatType;
  oversPerSide: number;
  playersPerTeam: number;
  venue: string;
  proposedDate: string;
  proposedTime?: string | null;
  message?: string | null;

  // Lifecycle & Status
  status: ChallengeStatus;
  declineReason?: string | null;

  // Generated Matches & Scorer PIN
  matchIds?: string[];
  scorerPin?: string;

  // Series Scoreboard Tracker
  challengerWins?: number;
  opponentWins?: number;
  tiedMatches?: number;
  winnerTeamId?: string | null;

  createdAt: string;
  updatedAt: string;
};

export type MatchStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "ABANDONED" | "NO_RESULT";
export type MatchStage = "LEAGUE" | "PLAYOFF" | "FINAL";
export type MatchDay = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

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
  oversPerSide?: number | null;
  maxOverPerBowler?: number | null;
  playersPerTeam?: number | null;
  maxWickets?: number | null;
  allowLastManStanding?: boolean | null;
  wideRuns?: number | null;
  noBallRuns?: number | null;
  freeHitEnabled?: boolean | null;
  formatType?: TournamentFormatType | null;
  status: MatchStatus;
  tossWinnerId?: string | null;
  tossDecision?: "BAT" | "BOWL" | null;
  winningTeamId?: string | null;
  resultText?: string | null;
  playerOfMatchId?: string | null;
  teamAPlayingVI?: string[];
  teamAReserveId?: string | null;
  teamBPlayingVI?: string[];
  teamBReserveId?: string | null;
  recentEvent?: {
    type: "FOUR" | "SIX" | "WICKET" | "MAIDEN" | "TOSS";
    text?: string;
    timestamp: number;
    batterName?: string;
    bowlerName?: string;
    dismissal?: string;
  } | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FallOfWicket = {
  wicketNumber: number;
  runs: number;
  balls: number;
  overs: string;
  playerId: string;
  playerName?: string;
  dismissal?: string | null;
  partnershipRuns?: number;
  partnershipBalls?: number;
};

export type Partnership = {
  wicketNumber: number;
  player1Id: string;
  player1Name?: string;
  player1Runs: number;
  player1Balls: number;
  player2Id: string;
  player2Name?: string;
  player2Runs: number;
  player2Balls: number;
  totalRuns: number;
  totalBalls: number;
  isUnbroken?: boolean;
};

export type Innings = {
  id: string;
  tournamentId?: string;
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
  strikerId?: string | null;
  nonStrikerId?: string | null;
  currentBowlerId?: string | null;
  recentBalls?: string[];
  fallOfWickets?: FallOfWicket[];
  partnerships?: Partnership[];
  createdAt: string;
  updatedAt: string;
};

export type BattingScore = {
  id: string;
  tournamentId?: string;
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
  tournamentId?: string;
  inningsId: string;
  playerId: string;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
};

export type QualificationStatusType =
  | "QUALIFIED_FINAL"
  | "QUALIFIED_PLAYOFF"
  | "QUALIFIED_TOP3"
  | "IN_CONTENTION"
  | "ELIMINATED";

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
  qualificationStatus?: QualificationStatusType;
  canReachTop3?: boolean;
  guaranteedTop3?: boolean;
  canReachRank1?: boolean;
  guaranteedRank1?: boolean;
  eliminated?: boolean;
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
  innings?: Innings[];
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

// ---------------------------------------------------------------------------
// Scalable Tournament-Scoped RBAC: User -> Tournament Membership -> Role
// ---------------------------------------------------------------------------
export type TournamentRole = "OWNER" | "ADMIN" | "SCORER";

export type TournamentMember = {
  id: string; // `${tournamentId}_${userId}`
  tournamentId: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  role: TournamentRole;
  invitedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const TOURNAMENT_ID = "main";

export const tournamentsCol = () => typedCollection<Omit<Tournament, "id">>("tournaments");
export const tournamentDoc = (id: string = TOURNAMENT_ID) => typedDoc<Omit<Tournament, "id">>("tournaments", id);
export const tournamentMembersCol = () => typedCollection<Omit<TournamentMember, "id">>("tournamentMembers");
export const tournamentMemberDoc = (id: string) => typedDoc<Omit<TournamentMember, "id">>("tournamentMembers", id);
export const tournamentTeamMembershipsCol = () => typedCollection<Omit<TournamentTeamMembership, "id">>("tournamentTeamMemberships");
export const tournamentTeamMembershipDoc = (id: string) => typedDoc<Omit<TournamentTeamMembership, "id">>("tournamentTeamMemberships", id);
export const teamsCol = () => typedCollection<Omit<Team, "id">>("teams");
export const playersCol = () => typedCollection<Omit<Player, "id">>("players");
export const matchesCol = () => typedCollection<Omit<Match, "id">>("matches");
export const inningsCol = () => typedCollection<Omit<Innings, "id">>("innings");
export const battingScoresCol = () => typedCollection<Omit<BattingScore, "id">>("battingScores");
export const bowlingScoresCol = () => typedCollection<Omit<BowlingScore, "id">>("bowlingScores");
export const standingsCol = () => typedCollection<Omit<Standing, "id">>("standings");
export const usersCol = () => typedCollection<Omit<UserAccount, "id">>("users");
export const teamChallengesCol = () => typedCollection<Omit<TeamChallenge, "id">>("teamChallenges");

// Individual doc refs
export const teamDoc = (id: string) => typedDoc<Omit<Team, "id">>("teams", id);
export const playerDoc = (id: string) => typedDoc<Omit<Player, "id">>("players", id);
export const matchDoc = (id: string) => typedDoc<Omit<Match, "id">>("matches", id);
export const inningsDoc = (id: string) => typedDoc<Omit<Innings, "id">>("innings", id);
export const standingDoc = (id: string) => typedDoc<Omit<Standing, "id">>("standings", id);
export const userDoc = (id: string) => typedDoc<Omit<UserAccount, "id">>("users", id);
export const teamChallengeDoc = (id: string) => typedDoc<Omit<TeamChallenge, "id">>("teamChallenges", id);

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
