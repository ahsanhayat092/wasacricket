export type TournamentFormatType =
  | "TAPE_BALL_INDOOR"
  | "T20"
  | "T10"
  | "HUNDRED"
  | "CUSTOM";

export type PlayoffFormatType =
  | "DIRECT_TOP2"
  | "PAGE_PLAYOFF_TOP3"
  | "IPL_TOP4"
  | "SEMI_FINALS";

export type TournamentStageFormat = "ROUND_ROBIN" | "GROUPS_AND_KNOCKOUT";

export type GroupPlayoffFormatType =
  | "GROUP_SEMI_FINALS"
  | "GROUP_DIRECT_FINAL";

export type MatchStage =
  | "LEAGUE"
  | "PLAYOFF"
  | "FINAL"
  | "QUALIFIER_1"
  | "ELIMINATOR"
  | "QUALIFIER_2"
  | "SEMI_1"
  | "SEMI_2";

export type MatchStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "ABANDONED" | "NO_RESULT";

export interface Tournament {
  id: string;
  name: string;
  shortName?: string;
  slug: string;
  formatType: TournamentFormatType;
  stageFormat?: TournamentStageFormat;
  groupPlayoffFormat?: GroupPlayoffFormatType;
  groups?: string[];
  groupCount?: number;
  teamsPerGroupAdvance?: number;
  winPoints?: number;
  tiePoints?: number;
  noResultPoints?: number;
  lossPoints?: number;
  oversPerSide: number;
  maxOverPerBowler: number;
  playersPerTeam: number;
  maxWickets?: number;
  allowLastManStanding: boolean;
  wideRuns: number;
  noBallRuns: number;
  freeHitEnabled: boolean;
  playoffFormat: PlayoffFormatType;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
  championTeamId?: string | null;
  config?: any;
  uiPresentation?: any;
  createdAt: any;
  updatedAt: any;
}

export interface Match {
  id: string;
  tournamentId: string;
  matchNumber: number;
  stage: MatchStage;
  groupName?: string | null;
  day?: string;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  teamAId?: string | null;
  teamBId?: string | null;
  oversPerSide: number;
  status: MatchStatus;
  tossWinnerId?: string | null;
  tossDecision?: "BAT" | "BOWL" | null;
  winningTeamId?: string | null;
  resultText?: string | null;
  playerOfMatchId?: string | null;
  completedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface Innings {
  id: string;
  matchId: string;
  inningsNumber: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  isAllOut: boolean;
  isCompleted: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface Standing {
  id: string;
  tournamentId: string;
  teamId: string;
  groupName?: string | null;
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
  position: number;
  status: "QUALIFIED_PLAYOFF" | "ELIMINATED" | "ACTIVE";
  updatedAt: any;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  shortName: string;
  groupName?: string | null;
  logoUrl?: string | null;
}
