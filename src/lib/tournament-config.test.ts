import { describe, it, expect } from "vitest";
import {
  createDefaultConfig,
  normalizeTournamentToConfig,
} from "./tournament-config";
import {
  generateTournamentConfigWithGemini,
  validateConfigWithAI,
  generateRulebookWithAI,
  transformConfigForRainOrDelay,
} from "./gemini-tournament-brain";

describe("PitchPe Tournament Configuration & Gemini AI Brain", () => {
  it("generates default battle-tested config for TAPE_BALL_INDOOR", () => {
    const config = createDefaultConfig("TAPE_BALL_INDOOR", "GROUPS_AND_KNOCKOUT", ["A", "B"]);
    expect(config.meta.preset).toBe("TAPE_BALL_INDOOR");
    expect(config.meta.ballType).toBe("TAPE_BALL");
    expect(config.matchRules.oversPerSide).toBe(4);
    expect(config.matchRules.maxOversPerBowler).toBe(1);
    expect(config.matchRules.allowLastManStanding).toBe(true);
    expect(config.matchRules.maxDismissals).toBe(6);
    expect(config.stages).toHaveLength(2);
    expect(config.stages[0].type).toBe("GROUPS");
    expect(config.stages[0].groups).toHaveLength(2);
    expect(config.uiPresentation.standingsLayout).toBe("GROUPED_TABS");
  });

  it("normalizes legacy tournament document into complete TournamentConfiguration", () => {
    const legacyTournament = {
      id: "tourney-123",
      name: "Corporate Clash",
      formatType: "T10" as const,
      oversPerSide: 8,
      maxOverPerBowler: 2,
      playersPerTeam: 8,
      allowLastManStanding: false,
      wideRuns: 2,
      noBallRuns: 2,
      freeHitEnabled: true,
      stageFormat: "GROUPS_AND_KNOCKOUT" as const,
      groups: ["A", "B"],
      teamsPerGroupAdvance: 2,
      winPoints: 3,
    };

    const normalized = normalizeTournamentToConfig(legacyTournament as any);
    expect(normalized.version).toBe("1.0.0");
    expect(normalized.matchRules.oversPerSide).toBe(8);
    expect(normalized.matchRules.maxOversPerBowler).toBe(2);
    expect(normalized.matchRules.playersPerTeam).toBe(8);
    expect(normalized.matchRules.wideRule.runs).toBe(2);
    expect(normalized.matchRules.noBallRule.runs).toBe(2);
    expect(normalized.pointsConfig.win).toBe(3);
    expect(normalized.uiPresentation.standingsLayout).toBe("GROUPED_TABS");
  });

  it("Gemini AI generates valid config from natural language prompt", async () => {
    const prompt =
      "Create a 6-team tape ball box tournament in 2 groups of 3. 5 overs per side, 1 over max per bowler, 6 players per team with last man standing, top 2 advance to crossover semis, 2 runs for no ball with free hit.";

    const res = await generateTournamentConfigWithGemini(prompt);
    expect(res.config.meta.preset).toBe("TAPE_BALL_INDOOR");
    expect(res.config.matchRules.oversPerSide).toBe(5);
    expect(res.config.matchRules.maxOversPerBowler).toBe(1);
    expect(res.config.matchRules.playersPerTeam).toBe(6);
    expect(res.config.matchRules.allowLastManStanding).toBe(true);
    expect(res.config.matchRules.maxDismissals).toBe(6);
    expect(res.config.matchRules.noBallRule.runs).toBe(2);
    expect(res.config.matchRules.noBallRule.freeHit).toBe(true);
    expect(res.config.stages[0].groups).toHaveLength(2);
    expect(res.config.uiPresentation.standingsLayout).toBe("GROUPED_TABS");
    expect(res.keyHighlights.length).toBeGreaterThan(0);
  });

  it("Gemini AI detects impossible bowler math and raises guardrail finding", () => {
    const invalidConfig = createDefaultConfig("T20", "ROUND_ROBIN");
    invalidConfig.matchRules.oversPerSide = 20;
    invalidConfig.matchRules.maxOversPerBowler = 2; // Requires 10 bowlers
    invalidConfig.matchRules.playersPerTeam = 6;     // Only 6 players available!

    const findings = validateConfigWithAI(invalidConfig);
    const bowlingError = findings.find((f) => f.category === "BOWLING_MATH" && f.type === "ERROR");
    expect(bowlingError).toBeDefined();
    expect(bowlingError?.title).toBe("Insufficient Bowlers Available");
  });

  it("generates official playing conditions rulebook from config", () => {
    const config = createDefaultConfig("T10", "GROUPS_AND_KNOCKOUT", ["A", "B"]);
    const rulebook = generateRulebookWithAI(config, "Asia Cup T10");
    expect(rulebook.length).toBeGreaterThan(5);
    expect(rulebook.some((r) => r.category === "Bowling & Deliveries")).toBe(true);
    expect(rulebook.some((r) => r.category === "Playoffs & Finals Qualification")).toBe(true);
  });

  it("transforms config mid-tournament for rain delay reduction", () => {
    const config = createDefaultConfig("T20", "ROUND_ROBIN");
    expect(config.matchRules.oversPerSide).toBe(20);

    const rainReduced = transformConfigForRainOrDelay(config, 8);
    expect(rainReduced.matchRules.oversPerSide).toBe(8);
    expect(rainReduced.matchRules.maxOversPerBowler).toBe(1);
  });

  it("preserves custom bowler quota (e.g. 3 overs in T10) across normalization", () => {
    const customT10 = {
      id: "asia-t10",
      name: "Asia Sixer T10",
      formatType: "T10" as const,
      oversPerSide: 10,
      maxOverPerBowler: 3, // Organizer explicitly chose 3 overs!
      playersPerTeam: 11,
      stageFormat: "GROUPS_AND_KNOCKOUT" as const,
      groups: ["A", "B"],
      teamsPerGroupAdvance: 2,
    };

    const normalized = normalizeTournamentToConfig(customT10 as any);
    expect(normalized.matchRules.oversPerSide).toBe(10);
    expect(normalized.matchRules.maxOversPerBowler).toBe(3);
  });

  it("creates Unified Single League Table with IPL_TOP4 playoff ladder without groups", () => {
    const config = createDefaultConfig("T20", "ROUND_ROBIN", [], "IPL_TOP4", {
      oversPerSide: 10,
      maxOversPerBowler: 3,
    });

    expect(config.stages[0].type).toBe("ROUND_ROBIN");
    expect(config.stages[0].groups).toBeUndefined();
    expect(config.stages[0].advancementRule?.type).toBe("PAGE_PLAYOFF");
    expect(config.stages[0].advancementRule?.advancingTeamsCount).toBe(4);
    expect(config.uiPresentation.standingsLayout).toBe("SINGLE_LEAGUE");
    expect(config.uiPresentation.bracketVisualization).toBe("PAGE_PLAYOFF");
    expect(config.matchRules.oversPerSide).toBe(10);
    expect(config.matchRules.maxOversPerBowler).toBe(3);

    const legacySingleLeague = {
      id: "single-123",
      name: "Premier League",
      formatType: "T20" as const,
      oversPerSide: 20,
      maxOverPerBowler: 4,
      stageFormat: "ROUND_ROBIN" as const,
      playoffFormat: "IPL_TOP4" as const,
    };

    const normalized = normalizeTournamentToConfig(legacySingleLeague as any);
    expect(normalized.stages[0].type).toBe("ROUND_ROBIN");
    expect(normalized.stages[0].groups).toBeUndefined();
    expect(normalized.uiPresentation.standingsLayout).toBe("SINGLE_LEAGUE");
    expect(normalized.stages[0].advancementRule?.advancingTeamsCount).toBe(4);
  });
});
