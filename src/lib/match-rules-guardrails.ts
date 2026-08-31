/**
 * Match Rules Guardrail & Validation Engine for PitchPe
 * Centralized, reusable mathematical and format validation for tournament rules.
 */

import type { TournamentFormatType, PlayoffFormatType } from "./firestore";

export type MatchRules = {
  formatPreset: TournamentFormatType;
  oversPerSide: number;
  maxOversPerBowler: number;
  playersPerTeam: number;
  maxDismissals: number;
  lastManStanding: boolean;
  freeHitOnNoBall: boolean;
  noBallPenalty: number;
  widePenalty: number;
};

export type ValidationIssue = {
  field?: keyof MatchRules | "general";
  message: string;
};

export type MatchRulesValidationResult = {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  normalizedRules: MatchRules;
  requiredBowlers: number;
  calculatedMaxDismissals: number;
};

export type CanonicalPreset = {
  name: string;
  description: string;
  formatType: TournamentFormatType;
  oversPerSide: number;
  minOvers?: number;
  maxOvers?: number;
  maxOversPerBowler: number;
  playersPerTeam: number;
  maxDismissals: number;
  lastManStanding: boolean;
  freeHitOnNoBall: boolean;
  noBallPenalty: number;
  widePenalty: number;
  playoffFormat: PlayoffFormatType;
  defaultMatchDurationMinutes: number;
};

export const CANONICAL_PRESETS: Record<TournamentFormatType, CanonicalPreset> = {
  TAPE_BALL_INDOOR: {
    name: "Indoor / Tape-Ball (Corporate/Box)",
    description: "Fast-paced tape-ball or indoor cricket with 6 starters, last-man standing, and strict bowler limits.",
    formatType: "TAPE_BALL_INDOOR",
    oversPerSide: 4,
    minOvers: 4,
    maxOvers: 8,
    maxOversPerBowler: 1,
    playersPerTeam: 6,
    maxDismissals: 6,
    lastManStanding: true,
    freeHitOnNoBall: true,
    noBallPenalty: 1,
    widePenalty: 1,
    playoffFormat: "DIRECT_TOP2",
    defaultMatchDurationMinutes: 40,
  },
  T10: {
    name: "T10 League",
    description: "Exciting 10-over blast with max 2 overs per bowler and full 11-player squads.",
    formatType: "T10",
    oversPerSide: 10,
    minOvers: 10,
    maxOvers: 10,
    maxOversPerBowler: 2,
    playersPerTeam: 11,
    maxDismissals: 10,
    lastManStanding: false,
    freeHitOnNoBall: true,
    noBallPenalty: 1,
    widePenalty: 1,
    playoffFormat: "PAGE_PLAYOFF_TOP3",
    defaultMatchDurationMinutes: 90,
  },
  T20: {
    name: "T20 Standard",
    description: "Official 20-over format, 4 overs per bowler max, standard ICC rules.",
    formatType: "T20",
    oversPerSide: 20,
    minOvers: 20,
    maxOvers: 20,
    maxOversPerBowler: 4,
    playersPerTeam: 11,
    maxDismissals: 10,
    lastManStanding: false,
    freeHitOnNoBall: true,
    noBallPenalty: 1,
    widePenalty: 1,
    playoffFormat: "IPL_TOP4",
    defaultMatchDurationMinutes: 180,
  },
  CUSTOM: {
    name: "Custom Engine",
    description: "Fully customized rules, custom overs, bowler quotas, and scoring configurations.",
    formatType: "CUSTOM",
    oversPerSide: 6,
    minOvers: 1,
    maxOvers: 50,
    maxOversPerBowler: 2,
    playersPerTeam: 8,
    maxDismissals: 7,
    lastManStanding: false,
    freeHitOnNoBall: true,
    noBallPenalty: 1,
    widePenalty: 1,
    playoffFormat: "DIRECT_TOP2",
    defaultMatchDurationMinutes: 60,
  },
  ODI: {
    name: "One Day (ODI)",
    description: "50-over match with 10 overs per bowler max and powerplays.",
    formatType: "ODI",
    oversPerSide: 50,
    minOvers: 50,
    maxOvers: 50,
    maxOversPerBowler: 10,
    playersPerTeam: 11,
    maxDismissals: 10,
    lastManStanding: false,
    freeHitOnNoBall: true,
    noBallPenalty: 1,
    widePenalty: 1,
    playoffFormat: "SEMI_FINALS",
    defaultMatchDurationMinutes: 420,
  },
  TEST: {
    name: "Multi-Day Test",
    description: "Unlimited overs, two innings per side with follow-on rules.",
    formatType: "TEST",
    oversPerSide: 90,
    minOvers: 1,
    maxOvers: 90,
    maxOversPerBowler: 90,
    playersPerTeam: 11,
    maxDismissals: 10,
    lastManStanding: false,
    freeHitOnNoBall: false,
    noBallPenalty: 1,
    widePenalty: 1,
    playoffFormat: "DIRECT_TOP2",
    defaultMatchDurationMinutes: 480,
  },
};

/**
 * Calculates standard bowling quota (ceil(overs / 5)) for standard cricket
 */
export function deriveStandardBowlerLimit(overs: number): number {
  if (overs <= 0) return 1;
  if (overs <= 5) return 1;
  return Math.ceil(overs / 5);
}

/**
 * Calculates the exact max dismissals allowed for a given player count and LMS state
 */
export function calculateMaxDismissals(playersPerTeam: number, lastManStanding: boolean): number {
  const safePlayers = Math.max(1, Math.floor(playersPerTeam || 6));
  return lastManStanding ? safePlayers : Math.max(1, safePlayers - 1);
}

/**
 * Normalizes raw/partial match rules into a clean, typed MatchRules object
 */
export function normalizeMatchRules(input: Partial<MatchRules> | any): MatchRules {
  const formatPreset: TournamentFormatType =
    input?.formatPreset === "TAPE_BALL_INDOOR" ||
    input?.formatPreset === "T10" ||
    input?.formatPreset === "T20" ||
    input?.formatPreset === "CUSTOM" ||
    input?.formatPreset === "ODI" ||
    input?.formatPreset === "TEST"
      ? input.formatPreset
      : "CUSTOM";

  const rawOvers = Number(input?.oversPerSide);
  const oversPerSide = Number.isFinite(rawOvers) ? rawOvers : 4;

  const rawBowler = Number(input?.maxOversPerBowler ?? input?.maxOverPerBowler);
  const maxOversPerBowler = Number.isFinite(rawBowler) ? rawBowler : 1;

  const rawPlayers = Number(input?.playersPerTeam);
  const playersPerTeam = Number.isFinite(rawPlayers) ? rawPlayers : 6;

  const lastManStanding = Boolean(input?.lastManStanding ?? input?.allowLastManStanding);

  const rawDismissals = Number(input?.maxDismissals ?? input?.maxWickets);
  const maxDismissals = Number.isFinite(rawDismissals)
    ? rawDismissals
    : calculateMaxDismissals(playersPerTeam, lastManStanding);

  const freeHitOnNoBall =
    input?.freeHitOnNoBall !== undefined
      ? Boolean(input.freeHitOnNoBall)
      : input?.freeHitEnabled !== undefined
      ? Boolean(input.freeHitEnabled)
      : true;

  const rawNoBall = Number(input?.noBallPenalty ?? input?.noBallRuns);
  const noBallPenalty = Number.isFinite(rawNoBall) ? rawNoBall : 1;

  const rawWide = Number(input?.widePenalty ?? input?.wideRuns);
  const widePenalty = Number.isFinite(rawWide) ? rawWide : 1;

  return {
    formatPreset,
    oversPerSide,
    maxOversPerBowler,
    playersPerTeam,
    maxDismissals,
    lastManStanding,
    freeHitOnNoBall,
    noBallPenalty,
    widePenalty,
  };
}

/**
 * Validates match rules according to all PitchPe cricket guardrails
 */
export function validateMatchRules(rawInput: Partial<MatchRules> | any): MatchRulesValidationResult {
  const normalizedRules = normalizeMatchRules(rawInput);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const {
    formatPreset,
    oversPerSide,
    maxOversPerBowler,
    playersPerTeam,
    maxDismissals,
    lastManStanding,
    noBallPenalty,
    widePenalty,
  } = normalizedRules;

  // 1. Overs Per Side Validation
  if (typeof rawInput?.oversPerSide === "number" && !Number.isInteger(rawInput.oversPerSide)) {
    errors.push({
      field: "oversPerSide",
      message: "Overs per side must be a whole number (integer).",
    });
  } else if (!Number.isInteger(oversPerSide)) {
    errors.push({
      field: "oversPerSide",
      message: "Overs per side must be a whole number (integer).",
    });
  }

  if (oversPerSide <= 0) {
    errors.push({
      field: "oversPerSide",
      message: "Overs per side must be at least 1.",
    });
  } else if (oversPerSide > 50) {
    errors.push({
      field: "oversPerSide",
      message: "Overs per side cannot exceed 50.",
    });
  }

  // Preset specific overs checks
  if (formatPreset === "TAPE_BALL_INDOOR") {
    if (oversPerSide < 4 || oversPerSide > 8) {
      errors.push({
        field: "oversPerSide",
        message: "Tape-Ball / Indoor format is restricted to 4–8 overs. Switch to Custom Engine for other over limits.",
      });
    }
  } else if (formatPreset === "T10") {
    if (oversPerSide !== 10) {
      errors.push({
        field: "oversPerSide",
        message: "T10 League preset requires exactly 10 overs. Switch to Custom Engine to customize overs.",
      });
    }
  } else if (formatPreset === "T20") {
    if (oversPerSide !== 20) {
      errors.push({
        field: "oversPerSide",
        message: "T20 Standard preset requires exactly 20 overs. Switch to Custom Engine to customize overs.",
      });
    }
  }

  // 2. Players Per Team Validation
  if (typeof rawInput?.playersPerTeam === "number" && !Number.isInteger(rawInput.playersPerTeam)) {
    errors.push({
      field: "playersPerTeam",
      message: "Players per team must be a whole number (integer).",
    });
  } else if (!Number.isInteger(playersPerTeam)) {
    errors.push({
      field: "playersPerTeam",
      message: "Players per team must be a whole number (integer).",
    });
  }

  if (playersPerTeam < 2) {
    errors.push({
      field: "playersPerTeam",
      message: "Players per team must be at least 2.",
    });
  } else if (playersPerTeam > 15) {
    errors.push({
      field: "playersPerTeam",
      message: "Players per team cannot exceed 15.",
    });
  }

  // Preset specific player checks
  if (formatPreset === "T10" && playersPerTeam !== 11) {
    errors.push({
      field: "playersPerTeam",
      message: "T10 League preset requires 11 players. Switch to Custom Engine to customize squad size.",
    });
  } else if (formatPreset === "T20" && playersPerTeam !== 11) {
    errors.push({
      field: "playersPerTeam",
      message: "T20 Standard preset requires 11 players. Switch to Custom Engine to customize squad size.",
    });
  }

  // 3. Max Overs Per Bowler Validation
  if (typeof rawInput?.maxOversPerBowler === "number" && !Number.isInteger(rawInput.maxOversPerBowler)) {
    errors.push({
      field: "maxOversPerBowler",
      message: "Max overs per bowler must be a whole number (integer).",
    });
  } else if (!Number.isInteger(maxOversPerBowler)) {
    errors.push({
      field: "maxOversPerBowler",
      message: "Max overs per bowler must be a whole number (integer).",
    });
  }

  if (maxOversPerBowler < 1) {
    errors.push({
      field: "maxOversPerBowler",
      message: "Max overs per bowler must be at least 1.",
    });
  } else if (maxOversPerBowler > oversPerSide && oversPerSide > 0) {
    errors.push({
      field: "maxOversPerBowler",
      message: "Maximum overs per bowler cannot exceed innings overs.",
    });
  }

  // Preset specific bowler limit checks
  if (formatPreset === "T10" && maxOversPerBowler !== 2) {
    errors.push({
      field: "maxOversPerBowler",
      message: "T10 League preset requires exactly 2 overs per bowler. Switch to Custom Engine to customize bowler limits.",
    });
  } else if (formatPreset === "T20" && maxOversPerBowler !== 4) {
    errors.push({
      field: "maxOversPerBowler",
      message: "T20 Standard preset requires exactly 4 overs per bowler. Switch to Custom Engine to customize bowler limits.",
    });
  }

  // 4. Mathematical Bowler Count Feasibility
  let requiredBowlers = 1;
  if (oversPerSide > 0 && maxOversPerBowler > 0) {
    requiredBowlers = Math.ceil(oversPerSide / maxOversPerBowler);

    if (playersPerTeam >= 2 && playersPerTeam < requiredBowlers) {
      errors.push({
        field: "playersPerTeam",
        message: `These rules require at least ${requiredBowlers} available bowlers to complete ${oversPerSide} overs, but only ${playersPerTeam} players are configured.`,
      });
    }
  }

  // 5. Max Dismissals / All Out Validation
  const expectedMaxDismissals = calculateMaxDismissals(playersPerTeam, lastManStanding);

  if (typeof rawInput?.maxDismissals === "number" && !Number.isInteger(rawInput.maxDismissals)) {
    errors.push({
      field: "maxDismissals",
      message: "Max dismissals must be a whole number (integer).",
    });
  }

  if (maxDismissals < 1) {
    errors.push({
      field: "maxDismissals",
      message: "Maximum dismissals must be at least 1.",
    });
  } else if (maxDismissals > playersPerTeam) {
    errors.push({
      field: "maxDismissals",
      message: `Maximum dismissals cannot exceed ${playersPerTeam} players.`,
    });
  } else if (!lastManStanding && maxDismissals > playersPerTeam - 1) {
    errors.push({
      field: "maxDismissals",
      message: `Maximum dismissals is ${playersPerTeam - 1} for a ${playersPerTeam}-player team when Last Man Standing is disabled.`,
    });
  }

  // 6. Extras Rules Validation (No-ball and Wide Penalty)
  if (typeof rawInput?.noBallPenalty === "number" && !Number.isInteger(rawInput.noBallPenalty)) {
    errors.push({
      field: "noBallPenalty",
      message: "No-ball penalty must be a whole number (integer).",
    });
  }
  if (noBallPenalty < 1) {
    errors.push({
      field: "noBallPenalty",
      message: "No-ball penalty must be at least 1 run.",
    });
  }

  if (typeof rawInput?.widePenalty === "number" && !Number.isInteger(rawInput.widePenalty)) {
    errors.push({
      field: "widePenalty",
      message: "Wide penalty must be a whole number (integer).",
    });
  }
  if (widePenalty < 1) {
    errors.push({
      field: "widePenalty",
      message: "Wide penalty must be at least 1 run.",
    });
  }

  // 7. Non-blocking Warnings (Technically valid but unusual)
  if (errors.length === 0) {
    if (requiredBowlers >= 8) {
      warnings.push({
        field: "maxOversPerBowler",
        message: `This configuration requires ${requiredBowlers} different bowlers. Make sure your team has enough bowling options.`,
      });
    }

    if (oversPerSide >= 20 && maxOversPerBowler >= 10 && formatPreset === "CUSTOM") {
      warnings.push({
        field: "maxOversPerBowler",
        message: `Allowing ${maxOversPerBowler} overs per bowler in a ${oversPerSide}-over match is unusually high for standard multi-bowler formats.`,
      });
    }

    if (lastManStanding && playersPerTeam > 8) {
      warnings.push({
        field: "lastManStanding",
        message: "Last Man Standing is usually enabled for short-sided tape-ball formats (6–8 players).",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedRules,
    requiredBowlers,
    calculatedMaxDismissals: expectedMaxDismissals,
  };
}

/**
 * Helper to check if a configuration deviates from a preset, returning true if custom
 */
export function isConfigurationCustom(rules: MatchRules): boolean {
  if (rules.formatPreset === "CUSTOM") return true;

  const preset = CANONICAL_PRESETS[rules.formatPreset];
  if (!preset) return true;

  if (rules.formatPreset === "TAPE_BALL_INDOOR") {
    if (rules.oversPerSide < 4 || rules.oversPerSide > 8) return true;
    if (rules.playersPerTeam !== 6) return true;
    if (!rules.lastManStanding) return true;
    return false;
  }

  if (rules.oversPerSide !== preset.oversPerSide) return true;
  if (rules.maxOversPerBowler !== preset.maxOversPerBowler) return true;
  if (rules.playersPerTeam !== preset.playersPerTeam) return true;
  if (rules.lastManStanding !== preset.lastManStanding) return true;

  return false;
}
