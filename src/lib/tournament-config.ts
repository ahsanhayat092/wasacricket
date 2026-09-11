/**
 * Universal Declarative Tournament Configuration Schema for PitchPe
 *
 * Single Source of Truth for:
 * 1. Match Rules (Scoring constraints, extras, overs, bowler limits, LMS)
 * 2. Stages & Progression (Groups, Knockouts, Crossover Semi-Finals, Ladders)
 * 3. Points & Tie-Breakers (Standings ranking order, bonus points)
 * 4. UI Presentation Directives (Client layout hints for Mobile & Web)
 */

import type { Tournament, TournamentFormatType, TournamentStageFormat } from "./firestore";

export type BallType = "LEATHER" | "HEAVY_TENNIS" | "TAPE_BALL" | "SOFT_SPONGE" | "RUBBER";

export type StageType = "GROUPS" | "ROUND_ROBIN" | "KNOCKOUT" | "SUPER_STAGE" | "FINALS";

export type QualificationRuleType =
  | "CROSS_SEMI_FINALS"    // A1 vs B2, B1 vs A2
  | "SAME_GROUP_SEMI"      // A1 vs A2, B1 vs B2
  | "DIRECT_FINAL"         // A1 vs B1
  | "PAGE_PLAYOFF"         // IPL 1v2, 3v4 eliminator
  | "TOP_N_KNOCKOUT"       // Top N advance to bracket
  | "NONE";

export interface StageGroupConfig {
  id: string;               // e.g. "A", "B", "POOL_1"
  name: string;             // e.g. "Group A"
  colorAccent: string;      // e.g. "#06B6D4"
  qualifyingSlots: number;  // e.g. 2
  teamIds?: string[];
}

export interface TournamentStageConfig {
  id: string;               // e.g. "stage-group-round", "stage-knockout"
  name: string;             // e.g. "Group Stage"
  type: StageType;
  sequenceOrder: number;
  groups?: StageGroupConfig[];
  advancementRule?: {
    type: QualificationRuleType;
    description: string;
    advancingTeamsCount: number;
  };
}

export interface MatchRulesConfig {
  oversPerSide: number;
  ballsPerOver: number;               // standard 6, or 5 (Hundred), or 8 (Tape-ball)
  maxOversPerBowler: number;
  playersPerTeam: number;
  maxDismissals: number;              // 10 for standard, 6 for box, etc.
  allowLastManStanding: boolean;
  noBallRule: {
    runs: number;                     // penalty runs (default 1)
    reball: boolean;                  // whether delivery must be re-bowled
    freeHit: boolean;                 // free hit on next ball
  };
  wideRule: {
    runs: number;                     // penalty runs (default 1)
    reball: boolean;                  // whether delivery must be re-bowled
  };
  superOver: {
    enabled: boolean;
    maxOvers: number;                 // usually 1
    maxWickets: number;               // usually 2
  };
  powerplay: {
    enabled: boolean;
    overs: number[];                  // e.g. [1, 2]
    maxFieldersOutsideCircle: number; // e.g. 2
  };
}

export interface PointsConfig {
  win: number;                        // default 2
  tie: number;                        // default 1
  noResult: number;                   // default 1
  loss: number;                       // default 0
  bonusPointsEnabled: boolean;
  bonusPointCriteria?: string;
}

export type TieBreakerCriterion =
  | "POINTS"
  | "NET_RUN_RATE"
  | "HEAD_TO_HEAD"
  | "TOTAL_WINS"
  | "FEWEST_DISMISSALS"
  | "SUPER_OVER";

export interface UiPresentationHints {
  standingsLayout: "GROUPED_TABS" | "GROUPED_STACKED" | "SINGLE_LEAGUE";
  showNrr: boolean;
  showNetRuns: boolean;
  scoringUiMode: "STANDARD_CRICKET" | "BOX_FAST_SCORING" | "TAPE_BALL_SIMPLE";
  groupThemes: Record<string, { name: string; primary: string; secondary?: string }>;
  qualifierBadges: Array<{
    rankCutoff: number;
    label: string;
    description: string;
    color: string;
  }>;
  bracketVisualization: "TREE" | "LIST" | "PAGE_PLAYOFF";
}

export interface TournamentConfiguration {
  version: "1.0.0";
  meta: {
    preset: TournamentFormatType;
    ballType: BallType;
    surfaceType?: "TURF" | "ASTROTURF" | "MATTING" | "CONCRETE" | "INDOOR";
    edition?: string;
    governingRulesNote?: string;
  };
  matchRules: MatchRulesConfig;
  stages: TournamentStageConfig[];
  pointsConfig: PointsConfig;
  tieBreakers: {
    order: TieBreakerCriterion[];
  };
  uiPresentation: UiPresentationHints;
}

/**
 * Creates a default, battle-tested configuration based on a standard format preset.
 */
export function createDefaultConfig(
  format: TournamentFormatType = "T20",
  stageFormat: TournamentStageFormat = "ROUND_ROBIN",
  groupsList: string[] = ["A", "B"],
  playoffFormat?: PlayoffFormatType,
  customRules?: Partial<MatchRulesConfig>,
): TournamentConfiguration {
  const isGrouped = stageFormat === "GROUPS_AND_KNOCKOUT";

  // 1. Preset Match Rules
  let matchRules: MatchRulesConfig;
  let ballType: BallType = "LEATHER";

  switch (format) {
    case "TAPE_BALL_INDOOR":
      ballType = "TAPE_BALL";
      matchRules = {
        oversPerSide: 4,
        ballsPerOver: 6,
        maxOversPerBowler: 1,
        playersPerTeam: 6,
        maxDismissals: 6,
        allowLastManStanding: true,
        noBallRule: { runs: 1, reball: true, freeHit: true },
        wideRule: { runs: 1, reball: true },
        superOver: { enabled: true, maxOvers: 1, maxWickets: 2 },
        powerplay: { enabled: false, overs: [], maxFieldersOutsideCircle: 3 },
      };
      break;

    case "T10":
      ballType = "HEAVY_TENNIS";
      matchRules = {
        oversPerSide: 10,
        ballsPerOver: 6,
        maxOversPerBowler: 2,
        playersPerTeam: 11,
        maxDismissals: 10,
        allowLastManStanding: false,
        noBallRule: { runs: 1, reball: true, freeHit: true },
        wideRule: { runs: 1, reball: true },
        superOver: { enabled: true, maxOvers: 1, maxWickets: 2 },
        powerplay: { enabled: true, overs: [1, 2, 3], maxFieldersOutsideCircle: 2 },
      };
      break;

    case "T20":
    default:
      ballType = "LEATHER";
      matchRules = {
        oversPerSide: 20,
        ballsPerOver: 6,
        maxOversPerBowler: 4,
        playersPerTeam: 11,
        maxDismissals: 10,
        allowLastManStanding: false,
        noBallRule: { runs: 1, reball: true, freeHit: true },
        wideRule: { runs: 1, reball: true },
        superOver: { enabled: true, maxOvers: 1, maxWickets: 2 },
        powerplay: { enabled: true, overs: [1, 2, 3, 4, 5, 6], maxFieldersOutsideCircle: 2 },
      };
      break;
  }

  // Merge any custom match rules if provided from tournament wizard
  if (customRules) {
    matchRules = {
      ...matchRules,
      ...customRules,
      wideRule: {
        ...matchRules.wideRule,
        ...(customRules.wideRule || {}),
      },
      noBallRule: {
        ...matchRules.noBallRule,
        ...(customRules.noBallRule || {}),
      },
    };
  }

  // 2. Stage Definitions
  const stages: TournamentStageConfig[] = [];

  if (isGrouped) {
    const groupConfigs: StageGroupConfig[] = groupsList.map((g, idx) => ({
      id: g,
      name: `Group ${g}`,
      colorAccent: idx === 0 ? "#06B6D4" : idx === 1 ? "#A855F7" : "#F59E0B",
      qualifyingSlots: 2,
    }));

    stages.push({
      id: "stage-1-groups",
      name: "Group Stage",
      type: "GROUPS",
      sequenceOrder: 1,
      groups: groupConfigs,
      advancementRule: {
        type: "CROSS_SEMI_FINALS",
        description: "Top 2 teams from Group A & Group B advance to Crossover Semi-Finals (A1 vs B2, B1 vs A2)",
        advancingTeamsCount: 4,
      },
    });

    stages.push({
      id: "stage-2-knockouts",
      name: "Playoffs & Final",
      type: "KNOCKOUT",
      sequenceOrder: 2,
      advancementRule: {
        type: "NONE",
        description: "Knockout elimination leading to the Champion",
        advancingTeamsCount: 1,
      },
    });
  } else {
    let advancementRule: StageAdvancementRule;
    if (playoffFormat === "DIRECT_TOP2") {
      advancementRule = {
        type: "DIRECT_FINAL",
        description: "Top 2 teams of league stage advance directly to the Grand Final.",
        advancingTeamsCount: 2,
      };
    } else if (playoffFormat === "PAGE_PLAYOFF_TOP3") {
      advancementRule = {
        type: "PAGE_PLAYOFF",
        description: "Rank 1 qualifies for Final. Rank 2 vs Rank 3 play Playoff for 2nd finalist spot.",
        advancingTeamsCount: 3,
      };
    } else if (playoffFormat === "SEMI_FINALS") {
      advancementRule = {
        type: "SEMI_FINALS",
        description: "Top 4 teams advance to Semi-Finals (Rank 1 vs 4, Rank 2 vs 3).",
        advancingTeamsCount: 4,
      };
    } else {
      advancementRule = {
        type: "PAGE_PLAYOFF",
        description: "Top 4 teams qualify for the IPL-style Playoff ladder (Qualifier 1, Eliminator, Qualifier 2, Final)",
        advancingTeamsCount: 4,
      };
    }

    stages.push({
      id: "stage-1-league",
      name: "Round Robin League",
      type: "ROUND_ROBIN",
      sequenceOrder: 1,
      advancementRule,
    });
    stages.push({
      id: "stage-2-playoffs",
      name: "Playoffs & Grand Final",
      type: "KNOCKOUT",
      sequenceOrder: 2,
    });
  }

  // 3. UI Presentation Hints
  const groupThemes: Record<string, { name: string; primary: string }> = {};
  if (isGrouped) {
    groupsList.forEach((g, idx) => {
      groupThemes[g] = {
        name: `Group ${g}`,
        primary: idx === 0 ? "#06B6D4" : idx === 1 ? "#A855F7" : "#10B981",
      };
    });
  }

  const uiPresentation: UiPresentationHints = {
    standingsLayout: isGrouped ? "GROUPED_TABS" : "SINGLE_LEAGUE",
    showNrr: true,
    showNetRuns: true,
    scoringUiMode: format === "TAPE_BALL_INDOOR" ? "TAPE_BALL_SIMPLE" : "STANDARD_CRICKET",
    groupThemes: isGrouped ? groupThemes : {},
    qualifierBadges: [
      {
        rankCutoff: isGrouped ? 2 : (playoffFormat === "DIRECT_TOP2" ? 2 : (playoffFormat === "PAGE_PLAYOFF_TOP3" ? 3 : 4)),
        label: "Q",
        description: "Qualified for Knockouts",
        color: "#10B981",
      },
    ],
    bracketVisualization: isGrouped ? "TREE" : (playoffFormat === "PAGE_PLAYOFF_TOP3" || playoffFormat === "IPL_TOP4" ? "PAGE_PLAYOFF" : "TREE"),
  };

  return {
    version: "1.0.0",
    meta: {
      preset: format,
      ballType,
      edition: "2026",
    },
    matchRules,
    stages,
    pointsConfig: {
      win: 2,
      tie: 1,
      noResult: 1,
      loss: 0,
      bonusPointsEnabled: false,
    },
    tieBreakers: {
      order: ["POINTS", "NET_RUN_RATE", "TOTAL_WINS", "HEAD_TO_HEAD"],
    },
    uiPresentation,
  };
}

/**
 * Ensures backwards compatibility: Takes any raw or partial tournament record
 * from Firestore and guarantees a complete, validated TournamentConfiguration.
 */
export function normalizeTournamentToConfig(tournament: Partial<Tournament> & { config?: any }): TournamentConfiguration {
  if (tournament?.config && tournament.config.version === "1.0.0" && tournament.config.matchRules) {
    return tournament.config as TournamentConfiguration;
  }

  // Generate fallback from existing root fields
  const format = tournament.formatType || "T20";
  const stageFormat = tournament.stageFormat || "ROUND_ROBIN";
  const groups = stageFormat === "GROUPS_AND_KNOCKOUT"
    ? (tournament.groups && tournament.groups.length > 0 ? tournament.groups : ["A", "B"])
    : [];

  const baseConfig = createDefaultConfig(format, stageFormat, groups, tournament.playoffFormat);

  if (tournament.oversPerSide) baseConfig.matchRules.oversPerSide = tournament.oversPerSide;
  if (tournament.maxOverPerBowler) baseConfig.matchRules.maxOversPerBowler = tournament.maxOverPerBowler;
  if (tournament.playersPerTeam) baseConfig.matchRules.playersPerTeam = tournament.playersPerTeam;
  if (typeof tournament.allowLastManStanding === "boolean") {
    baseConfig.matchRules.allowLastManStanding = tournament.allowLastManStanding;
    if (tournament.allowLastManStanding) {
      baseConfig.matchRules.maxDismissals = baseConfig.matchRules.playersPerTeam;
    }
  }
  if (tournament.winPoints !== undefined) baseConfig.pointsConfig.win = tournament.winPoints;
  if (tournament.tiePoints !== undefined) baseConfig.pointsConfig.tie = tournament.tiePoints;
  if (tournament.noResultPoints !== undefined) baseConfig.pointsConfig.noResult = tournament.noResultPoints;
  if (tournament.lossPoints !== undefined) baseConfig.pointsConfig.loss = tournament.lossPoints;

  if (tournament.wideRuns !== undefined) baseConfig.matchRules.wideRule.runs = tournament.wideRuns;
  if (tournament.noBallRuns !== undefined) baseConfig.matchRules.noBallRule.runs = tournament.noBallRuns;
  if (tournament.freeHitEnabled !== undefined) baseConfig.matchRules.noBallRule.freeHit = tournament.freeHitEnabled;

  return baseConfig;
}
