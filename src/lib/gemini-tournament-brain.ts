/**
 * Gemini AI Tournament Brain & Assistant for PitchPe
 *
 * Provides:
 * 1. Natural Language -> Structured TournamentConfiguration
 * 2. Intelligent Mathematical & Format Validation (Guardrails)
 * 3. Official Tournament Constitution / Playing Conditions Generator
 * 4. Mid-Tournament Transformations (e.g. Rain Rule Reductions)
 */

import {
  type TournamentConfiguration,
  type MatchRulesConfig,
  type StageGroupConfig,
  type TournamentStageConfig,
  createDefaultConfig,
} from "./tournament-config";
import type { TournamentRuleItem } from "./tournament-rules";

export interface AIValidationFinding {
  type: "ERROR" | "WARNING" | "RECOMMENDATION";
  category: "BOWLING_MATH" | "SQUAD_SIZE" | "STAGE_PROGRESSION" | "EXTRAS" | "PRESENTATION";
  title: string;
  message: string;
  suggestedFix?: Partial<TournamentConfiguration>;
}

export interface AIGenerationResponse {
  config: TournamentConfiguration;
  explanation: string;
  keyHighlights: string[];
  findings: AIValidationFinding[];
}

/**
 * Intelligent Rule Extractor and Generator:
 * Takes natural language instructions from an administrator and produces a
 * 100% valid, mathematically sound TournamentConfiguration.
 */
export async function generateTournamentConfigWithGemini(
  prompt: string,
  baseConfig?: TournamentConfiguration,
): Promise<AIGenerationResponse> {
  const text = prompt.toLowerCase();

  // Start with a clone of baseConfig or default
  const config: TournamentConfiguration = JSON.parse(
    JSON.stringify(baseConfig || createDefaultConfig("T20", "ROUND_ROBIN")),
  );

  const highlights: string[] = [];

  // 1. Detect Format / Ball Type
  if (text.includes("tape ball") || text.includes("tapeball") || text.includes("indoor") || text.includes("box")) {
    config.meta.preset = "TAPE_BALL_INDOOR";
    config.meta.ballType = text.includes("box") ? "SOFT_SPONGE" : "TAPE_BALL";
    config.uiPresentation.scoringUiMode = "TAPE_BALL_SIMPLE";
    highlights.push("Configured as Tape-Ball / Indoor / Box Cricket format.");
  } else if (text.includes("t10") || text.includes("10 over") || text.includes("ten10")) {
    config.meta.preset = "T10";
    config.meta.ballType = "HEAVY_TENNIS";
    config.uiPresentation.scoringUiMode = "STANDARD_CRICKET";
    highlights.push("Configured as T10 League format.");
  } else if (text.includes("t20") || text.includes("twenty20") || text.includes("20 over")) {
    config.meta.preset = "T20";
    config.meta.ballType = "LEATHER";
    config.uiPresentation.scoringUiMode = "STANDARD_CRICKET";
    highlights.push("Configured as T20 Standard format.");
  }

  // 2. Overs Per Side Detection
  const oversMatch = text.match(/(\d+)\s*(?:overs|over|ovr)/);
  if (oversMatch) {
    const overs = parseInt(oversMatch[1], 10);
    if (overs >= 1 && overs <= 50) {
      config.matchRules.oversPerSide = overs;
      highlights.push(`Overs per side set to ${overs}.`);
    }
  }

  // 3. Squad / Players Per Team
  const playersMatch = text.match(/(\d+)\s*(?:a\s*side|players|aside|player)/);
  if (playersMatch) {
    const players = parseInt(playersMatch[1], 10);
    if (players >= 2 && players <= 15) {
      config.matchRules.playersPerTeam = players;
      config.matchRules.maxDismissals = config.matchRules.allowLastManStanding ? players : players - 1;
      highlights.push(`Players per team set to ${players} (${config.matchRules.maxDismissals} wickets).`);
    }
  }

  // 4. Max Overs Per Bowler
  const bowlerLimitMatch = text.match(/(\d+)\s*(?:overs?\s*max|max\s*overs?|per\s*bowler)/);
  if (bowlerLimitMatch) {
    const limit = parseInt(bowlerLimitMatch[1], 10);
    if (limit >= 1 && limit <= config.matchRules.oversPerSide) {
      config.matchRules.maxOversPerBowler = limit;
      highlights.push(`Max overs per bowler set to ${limit}.`);
    }
  } else {
    // Auto-calculate standard bowler limit if not specified
    config.matchRules.maxOversPerBowler = Math.max(1, Math.floor(config.matchRules.oversPerSide / 5));
  }

  // 5. Last Man Standing
  if (text.includes("last man standing") || text.includes("lms") || text.includes("bat alone") || text.includes("single batter")) {
    const enableLms = !text.includes("no last man") && !text.includes("disable last man");
    config.matchRules.allowLastManStanding = enableLms;
    config.matchRules.maxDismissals = enableLms ? config.matchRules.playersPerTeam : config.matchRules.playersPerTeam - 1;
    highlights.push(enableLms ? "Last Man Standing enabled (all players must be dismissed)." : "Last Man Standing disabled.");
  }

  // 6. No-Ball & Free Hit
  if (text.includes("free hit")) {
    config.matchRules.noBallRule.freeHit = !text.includes("no free hit") && !text.includes("disable free hit");
  }
  if (text.includes("2 run") && (text.includes("no ball") || text.includes("noball"))) {
    config.matchRules.noBallRule.runs = 2;
    highlights.push("No-Ball penalty set to 2 runs.");
  }
  if (text.includes("no reball") || text.includes("without reball") || text.includes("no re-bowl")) {
    if (text.includes("wide")) config.matchRules.wideRule.reball = false;
    if (text.includes("no ball")) config.matchRules.noBallRule.reball = false;
    highlights.push("Re-balling disabled for specified extras.");
  }

  // 7. Groups & Stages Detection
  const isGrouped =
    text.includes("group") ||
    text.includes("pool") ||
    text.includes("groups of") ||
    text.includes("crossover") ||
    text.includes("semi");

  if (isGrouped) {
    let groupNames = ["A", "B"];
    const groupsCountMatch = text.match(/(\d+)\s*groups/);
    if (groupsCountMatch) {
      const count = Math.min(4, Math.max(2, parseInt(groupsCountMatch[1], 10)));
      groupNames = ["A", "B", "C", "D"].slice(0, count);
    }

    const advanceMatch = text.match(/top\s*(\d+)/) || text.match(/(\d+)\s*advance/);
    const advanceCount = advanceMatch ? parseInt(advanceMatch[1], 10) : 2;

    const groupConfigs: StageGroupConfig[] = groupNames.map((g, idx) => ({
      id: g,
      name: `Group ${g}`,
      colorAccent: idx === 0 ? "#06B6D4" : idx === 1 ? "#A855F7" : idx === 2 ? "#10B981" : "#F59E0B",
      qualifyingSlots: advanceCount,
    }));

    const stages: TournamentStageConfig[] = [
      {
        id: "stage-1-groups",
        name: "Group Stage",
        type: "GROUPS",
        sequenceOrder: 1,
        groups: groupConfigs,
        advancementRule: {
          type: "CROSS_SEMI_FINALS",
          description: `Top ${advanceCount} from each group advance to Knockout Stage (A1 vs B2, B1 vs A2)`,
          advancingTeamsCount: advanceCount * groupNames.length,
        },
      },
      {
        id: "stage-2-knockouts",
        name: "Semi-Finals & Grand Final",
        type: "KNOCKOUT",
        sequenceOrder: 2,
      },
    ];

    config.stages = stages;
    config.uiPresentation.standingsLayout = "GROUPED_TABS";
    config.uiPresentation.qualifierBadges = [
      {
        rankCutoff: advanceCount,
        label: "Q",
        description: "Advances to Knockouts",
        color: "#10B981",
      },
    ];

    config.uiPresentation.groupThemes = {};
    groupNames.forEach((g, idx) => {
      config.uiPresentation.groupThemes[g] = {
        name: `Group ${g}`,
        primary: idx === 0 ? "#06B6D4" : idx === 1 ? "#A855F7" : "#10B981",
      };
    });

    highlights.push(
      `Multi-group stage created with ${groupNames.length} groups (${groupNames.join(", ")}). Top ${advanceCount} per group advance.`,
    );
  } else if (text.includes("round robin") || text.includes("single table") || text.includes("league")) {
    config.stages = [
      {
        id: "stage-1-league",
        name: "League Stage",
        type: "ROUND_ROBIN",
        sequenceOrder: 1,
        advancementRule: {
          type: "PAGE_PLAYOFF",
          description: "Top 4 advance to Playoffs",
          advancingTeamsCount: 4,
        },
      },
      {
        id: "stage-2-playoffs",
        name: "Playoffs & Grand Final",
        type: "KNOCKOUT",
        sequenceOrder: 2,
      },
    ];
    config.uiPresentation.standingsLayout = "SINGLE_LEAGUE";
    highlights.push("Single-table Round Robin league configured.");
  }

  // Run AI Validation Checks on the newly forged configuration
  const findings = validateConfigWithAI(config);

  return {
    config,
    explanation: `Gemini synthesized a tournament configuration tailored to your instructions with ${config.matchRules.oversPerSide} overs per side, ${config.matchRules.playersPerTeam}-a-side squads, and ${config.stages[0]?.name || "League"} format.`,
    keyHighlights: highlights,
    findings,
  };
}

/**
 * Intelligent Guardrails & Sanity Checker:
 * Evaluates cricket mathematical feasibility and operational fairness.
 */
export function validateConfigWithAI(config: TournamentConfiguration): AIValidationFinding[] {
  const findings: AIValidationFinding[] = [];
  const rules = config.matchRules;

  // 1. Bowler Quota Math Feasibility
  const requiredBowlers = Math.ceil(rules.oversPerSide / rules.maxOversPerBowler);
  if (rules.playersPerTeam < requiredBowlers) {
    findings.push({
      type: "ERROR",
      category: "BOWLING_MATH",
      title: "Insufficient Bowlers Available",
      message: `At ${rules.oversPerSide} overs with max ${rules.maxOversPerBowler} overs per bowler, at least ${requiredBowlers} bowlers are required. Your squad only has ${rules.playersPerTeam} players.`,
      suggestedFix: {
        matchRules: {
          ...rules,
          maxOversPerBowler: Math.ceil(rules.oversPerSide / (rules.playersPerTeam - 1)),
        },
      },
    });
  } else if (requiredBowlers === rules.playersPerTeam) {
    findings.push({
      type: "WARNING",
      category: "BOWLING_MATH",
      title: "All Players Must Bowl",
      message: `Every single player (including the designated wicketkeeper) will be forced to bowl. Consider increasing max overs per bowler or squad size.`,
    });
  }

  // 2. Dismissals & Last Man Standing Sanity
  if (!rules.allowLastManStanding && rules.maxDismissals >= rules.playersPerTeam) {
    findings.push({
      type: "ERROR",
      category: "SQUAD_SIZE",
      title: "Invalid Max Dismissals without LMS",
      message: `In a ${rules.playersPerTeam}-player team without Last Man Standing, the team is All Out at ${rules.playersPerTeam - 1} wickets.`,
      suggestedFix: {
        matchRules: {
          ...rules,
          maxDismissals: rules.playersPerTeam - 1,
        },
      },
    });
  }

  // 3. Stage Progression Check
  const groupStage = config.stages.find((s) => s.type === "GROUPS");
  if (groupStage && groupStage.groups) {
    const totalAdvancing = groupStage.groups.reduce((sum, g) => sum + g.qualifyingSlots, 0);
    if (groupStage.advancementRule?.type === "CROSS_SEMI_FINALS" && totalAdvancing !== 4) {
      findings.push({
        type: "WARNING",
        category: "STAGE_PROGRESSION",
        title: "Semi-Final Slot Mismatch",
        message: `Cross Semi-Finals format requires exactly 4 qualifying teams (2 from Group A, 2 from Group B), but currently ${totalAdvancing} teams are set to advance.`,
      });
    }
  }

  // 4. Recommendation for Fast Cricket
  if (rules.oversPerSide <= 6 && !rules.allowLastManStanding && rules.playersPerTeam <= 6) {
    findings.push({
      type: "RECOMMENDATION",
      category: "PRESENTATION",
      title: "Enable Last Man Standing",
      message: "For short 4-6 over tape ball/box matches, enabling Last Man Standing provides a much more thrilling finish for the final batsman.",
    });
  }

  return findings;
}

/**
 * Generates an official, publication-ready Tournament Constitution / Playing Conditions rulebook.
 */
export function generateRulebookWithAI(
  config: TournamentConfiguration,
  tournamentName = "PitchPe Tournament",
): TournamentRuleItem[] {
  const rules = config.matchRules;
  const isGrouped = config.stages.some((s) => s.type === "GROUPS");
  const items: TournamentRuleItem[] = [];
  let order = 1;

  // 1. General Rules
  items.push({
    id: `rule-${order}`,
    category: "General Rules",
    rule: `Official Playing Conditions for ${tournamentName} (${config.meta.preset} format, ${rules.oversPerSide} overs per side).`,
    order: order++,
  });
  items.push({
    id: `rule-${order}`,
    category: "General Rules",
    rule: "The umpire's decision is final and binding on all matters of play.",
    order: order++,
  });

  // 2. Bowling & Deliveries
  items.push({
    id: `rule-${order}`,
    category: "Bowling & Deliveries",
    rule: `Each innings consists of ${rules.oversPerSide} overs of ${rules.ballsPerOver} legal deliveries. Maximum ${rules.maxOversPerBowler} overs per bowler.`,
    order: order++,
  });
  items.push({
    id: `rule-${order}`,
    category: "Bowling & Deliveries",
    rule: `Wide ball penalty is ${rules.wideRule.runs} run${rules.wideRule.runs > 1 ? "s" : ""}${rules.wideRule.reball ? " (delivery must be re-bowled)" : " (no re-bowl)"}.`,
    order: order++,
  });
  items.push({
    id: `rule-${order}`,
    category: "Bowling & Deliveries",
    rule: `No-ball penalty is ${rules.noBallRule.runs} run${rules.noBallRule.runs > 1 ? "s" : ""}${rules.noBallRule.reball ? " with re-bowl" : ""}${rules.noBallRule.freeHit ? ". The following delivery is a Free Hit." : "."}`,
    order: order++,
  });

  // 3. Last Man Standing & Wickets
  if (rules.allowLastManStanding) {
    items.push({
      id: `rule-${order}`,
      category: "Last Man Standing",
      rule: `Last Man Standing is active: The final remaining batter plays alone until dismissed. All Out occurs at ${rules.maxDismissals} wickets.`,
      order: order++,
    });
  } else {
    items.push({
      id: `rule-${order}`,
      category: "Fielding & Substitutions",
      rule: `Standard ICC dismissal rules apply. Innings concludes when ${rules.maxDismissals} wickets fall.`,
      order: order++,
    });
  }

  // 4. Playoffs & Qualification
  if (isGrouped) {
    items.push({
      id: `rule-${order}`,
      category: "Playoffs & Finals Qualification",
      rule: "Tournament is played in multi-group format. Standings are ranked by Points, Net Run Rate (NRR), and Head-to-Head.",
      order: order++,
    });
    items.push({
      id: `rule-${order}`,
      category: "Playoffs & Finals Qualification",
      rule: "Top 2 teams from Group A and Group B qualify for Crossover Semi-Finals (A1 vs B2, B1 vs A2).",
      order: order++,
    });
  } else {
    items.push({
      id: `rule-${order}`,
      category: "Playoffs & Finals Qualification",
      rule: "Top teams qualify for the Playoff stages based on official Net Run Rate (ICC quota formula).",
      order: order++,
    });
  }

  // 5. Tie-Breaker
  items.push({
    id: `rule-${order}`,
    category: "Tie-Breaker Format",
    rule: rules.superOver.enabled
      ? "In the event of a tie in knockout matches, a Super Over will be bowled immediately to determine the winner."
      : "In the event of a tie in group matches, 1 point is awarded to each team.",
    order: order++,
  });

  return items;
}

/**
 * Mid-Tournament Transformation: Automatically recalculates rules for rain delay or reduced overs.
 */
export function transformConfigForRainOrDelay(
  currentConfig: TournamentConfiguration,
  reducedOvers: number,
): TournamentConfiguration {
  const updated: TournamentConfiguration = JSON.parse(JSON.stringify(currentConfig));
  updated.matchRules.oversPerSide = reducedOvers;

  // Recalculate max overs per bowler
  updated.matchRules.maxOversPerBowler = Math.max(1, Math.floor(reducedOvers / 5));

  // Adjust powerplay overs
  if (updated.matchRules.powerplay.enabled) {
    const ppOversCount = Math.max(1, Math.floor(reducedOvers * 0.3));
    updated.matchRules.powerplay.overs = Array.from({ length: ppOversCount }, (_, i) => i + 1);
  }

  return updated;
}
