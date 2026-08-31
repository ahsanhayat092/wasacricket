import { describe, it, expect } from "vitest";
import {
  validateMatchRules,
  calculateMaxDismissals,
  deriveStandardBowlerLimit,
  isConfigurationCustom,
  CANONICAL_PRESETS,
  type MatchRules,
} from "./match-rules-guardrails";

describe("PitchPe Match Rules Guardrail & Validation Engine Suite", () => {
  // ==========================================
  // 1. VALID CASES
  // ==========================================

  it("1. Validates Tape Ball — 4 overs — 6 players — 1 over/bowler — LMS ON", () => {
    const result = validateMatchRules({
      formatPreset: "TAPE_BALL_INDOOR",
      oversPerSide: 4,
      maxOversPerBowler: 1,
      playersPerTeam: 6,
      maxDismissals: 6,
      lastManStanding: true,
      freeHitOnNoBall: true,
      noBallPenalty: 1,
      widePenalty: 1,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.requiredBowlers).toBe(4);
    expect(result.calculatedMaxDismissals).toBe(6);
  });

  it("2. Validates Tape Ball — 8 overs — 6 players — 2 overs/bowler — LMS ON", () => {
    const result = validateMatchRules({
      formatPreset: "TAPE_BALL_INDOOR",
      oversPerSide: 8,
      maxOversPerBowler: 2,
      playersPerTeam: 6,
      maxDismissals: 6,
      lastManStanding: true,
      freeHitOnNoBall: true,
      noBallPenalty: 1,
      widePenalty: 1,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.requiredBowlers).toBe(4);
  });

  it("3. Validates T10 — 10 overs — 11 players — 2 overs/bowler", () => {
    const result = validateMatchRules({
      formatPreset: "T10",
      oversPerSide: 10,
      maxOversPerBowler: 2,
      playersPerTeam: 11,
      maxDismissals: 10,
      lastManStanding: false,
      freeHitOnNoBall: true,
      noBallPenalty: 1,
      widePenalty: 1,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.requiredBowlers).toBe(5);
    expect(result.calculatedMaxDismissals).toBe(10);
  });

  it("4. Validates T20 — 20 overs — 11 players — 4 overs/bowler", () => {
    const result = validateMatchRules({
      formatPreset: "T20",
      oversPerSide: 20,
      maxOversPerBowler: 4,
      playersPerTeam: 11,
      maxDismissals: 10,
      lastManStanding: false,
      freeHitOnNoBall: true,
      noBallPenalty: 1,
      widePenalty: 1,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.requiredBowlers).toBe(5);
    expect(result.calculatedMaxDismissals).toBe(10);
  });

  it("5. Validates Custom — 5 overs — 5 players — 1 over/bowler", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 5,
      maxOversPerBowler: 1,
      playersPerTeam: 5,
      maxDismissals: 4,
      lastManStanding: false,
      freeHitOnNoBall: true,
      noBallPenalty: 1,
      widePenalty: 1,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.requiredBowlers).toBe(5);
  });

  it("6. Validates Custom — 20 overs — 10 players — 2 overs/bowler", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 20,
      maxOversPerBowler: 2,
      playersPerTeam: 10,
      maxDismissals: 9,
      lastManStanding: false,
      freeHitOnNoBall: true,
      noBallPenalty: 1,
      widePenalty: 1,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.requiredBowlers).toBe(10);
  });

  // ==========================================
  // 2. INVALID CASES
  // ==========================================

  it("7. Rejects 0 overs", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 0,
      maxOversPerBowler: 1,
      playersPerTeam: 11,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "oversPerSide" && e.message.includes("at least 1"))).toBe(true);
  });

  it("8. Rejects -2 overs", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: -2,
      maxOversPerBowler: 1,
      playersPerTeam: 11,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "oversPerSide")).toBe(true);
  });

  it("9. Rejects 51 overs", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 51,
      maxOversPerBowler: 10,
      playersPerTeam: 11,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "oversPerSide" && e.message.includes("cannot exceed 50"))).toBe(true);
  });

  it("10. Rejects 20 overs with max 21 overs/bowler", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 20,
      maxOversPerBowler: 21,
      playersPerTeam: 11,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "maxOversPerBowler" && e.message.includes("cannot exceed innings overs"))).toBe(true);
  });

  it("11. Rejects 20 overs with 0 overs/bowler", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 20,
      maxOversPerBowler: 0,
      playersPerTeam: 11,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "maxOversPerBowler" && e.message.includes("at least 1"))).toBe(true);
  });

  it("12. Rejects 20 overs, 4 players, max 1 over/bowler (requires 20 bowlers > 4 players)", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 20,
      maxOversPerBowler: 1,
      playersPerTeam: 4,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "playersPerTeam" && e.message.includes("require at least 20 available bowlers"))).toBe(true);
  });

  it("13. Rejects 6 players with 10 max dismissals", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 6,
      maxOversPerBowler: 2,
      playersPerTeam: 6,
      maxDismissals: 10,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "maxDismissals" && e.message.includes("cannot exceed 6 players"))).toBe(true);
  });

  it("14. Rejects 6 players, LMS OFF, 6 max dismissals", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 6,
      maxOversPerBowler: 2,
      playersPerTeam: 6,
      lastManStanding: false,
      maxDismissals: 6,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "maxDismissals" && e.message.includes("Maximum dismissals is 5 for a 6-player team"))).toBe(true);
  });

  it("15. Rejects negative no-ball penalty", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 20,
      maxOversPerBowler: 4,
      playersPerTeam: 11,
      noBallPenalty: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "noBallPenalty")).toBe(true);
  });

  it("16. Rejects negative wide penalty", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 20,
      maxOversPerBowler: 4,
      playersPerTeam: 11,
      widePenalty: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "widePenalty")).toBe(true);
  });

  it("17. Rejects decimal player count", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 20,
      maxOversPerBowler: 4,
      playersPerTeam: 10.5,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "playersPerTeam" && e.message.includes("whole number"))).toBe(true);
  });

  it("18. Rejects decimal overs", () => {
    const result = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 19.5,
      maxOversPerBowler: 4,
      playersPerTeam: 11,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "oversPerSide" && e.message.includes("whole number"))).toBe(true);
  });

  it("19. Rejects T20 preset showing 17 overs", () => {
    const result = validateMatchRules({
      formatPreset: "T20",
      oversPerSide: 17,
      maxOversPerBowler: 4,
      playersPerTeam: 11,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "oversPerSide" && e.message.includes("T20 Standard preset requires exactly 20 overs"))).toBe(true);
  });

  it("20. Rejects T10 preset showing 3 overs/bowler", () => {
    const result = validateMatchRules({
      formatPreset: "T10",
      oversPerSide: 10,
      maxOversPerBowler: 3,
      playersPerTeam: 11,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "maxOversPerBowler" && e.message.includes("T10 League preset requires exactly 2 overs per bowler"))).toBe(true);
  });

  // ==========================================
  // 3. EDGE CASES & DYNAMIC DERIVATIONS
  // ==========================================

  it("21. Edge: Change 20 overs → 4 overs auto-adjusts required bowlers and validation", () => {
    const rules20: MatchRules = {
      formatPreset: "CUSTOM",
      oversPerSide: 20,
      maxOversPerBowler: 4,
      playersPerTeam: 11,
      maxDismissals: 10,
      lastManStanding: false,
      freeHitOnNoBall: true,
      noBallPenalty: 1,
      widePenalty: 1,
    };
    expect(validateMatchRules(rules20).valid).toBe(true);

    const rules4: MatchRules = {
      ...rules20,
      oversPerSide: 4,
      maxOversPerBowler: 1,
    };
    const res = validateMatchRules(rules4);
    expect(res.valid).toBe(true);
    expect(res.requiredBowlers).toBe(4);
  });

  it("22. Edge: Change 11 players → 6 players recalculates dismissals", () => {
    const dismissals11LmsOff = calculateMaxDismissals(11, false);
    expect(dismissals11LmsOff).toBe(10);

    const dismissals6LmsOff = calculateMaxDismissals(6, false);
    expect(dismissals6LmsOff).toBe(5);

    const dismissals6LmsOn = calculateMaxDismissals(6, true);
    expect(dismissals6LmsOn).toBe(6);
  });

  it("23. Edge: Toggle LMS OFF → ON expands max dismissals from 5 to 6 for 6 players", () => {
    const off = calculateMaxDismissals(6, false);
    const on = calculateMaxDismissals(6, true);
    expect(off).toBe(5);
    expect(on).toBe(6);
  });

  it("24. Edge: Toggle LMS ON → OFF restricts max dismissals from 11 to 10 for 11 players", () => {
    const on = calculateMaxDismissals(11, true);
    const off = calculateMaxDismissals(11, false);
    expect(on).toBe(11);
    expect(off).toBe(10);
  });

  it("25. Edge: Change max bowler overs from 4 → 1 increases required bowler count from 5 to 20", () => {
    const res4 = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 20,
      maxOversPerBowler: 4,
      playersPerTeam: 11,
    });
    expect(res4.requiredBowlers).toBe(5);

    const res1 = validateMatchRules({
      formatPreset: "CUSTOM",
      oversPerSide: 20,
      maxOversPerBowler: 1,
      playersPerTeam: 11,
    });
    expect(res1.requiredBowlers).toBe(20);
    expect(res1.valid).toBe(false); // 11 players cannot bowl 20 distinct overs
  });

  it("26. Edge: Switch T20 → Tape Ball canonical preset loading", () => {
    const tapeBallPreset = CANONICAL_PRESETS.TAPE_BALL_INDOOR;
    const res = validateMatchRules(tapeBallPreset);
    expect(res.valid).toBe(true);
    expect(res.normalizedRules.oversPerSide).toBe(4);
    expect(res.normalizedRules.playersPerTeam).toBe(6);
    expect(res.normalizedRules.lastManStanding).toBe(true);
  });

  it("27. Edge: Switch Tape Ball → T20 canonical preset loading", () => {
    const t20Preset = CANONICAL_PRESETS.T20;
    const res = validateMatchRules(t20Preset);
    expect(res.valid).toBe(true);
    expect(res.normalizedRules.oversPerSide).toBe(20);
    expect(res.normalizedRules.playersPerTeam).toBe(11);
    expect(res.normalizedRules.lastManStanding).toBe(false);
  });

  it("28. Edge: Modify T20 rules and verify isConfigurationCustom returns true", () => {
    const standardT20: MatchRules = {
      formatPreset: "T20",
      oversPerSide: 20,
      maxOversPerBowler: 4,
      playersPerTeam: 11,
      maxDismissals: 10,
      lastManStanding: false,
      freeHitOnNoBall: true,
      noBallPenalty: 1,
      widePenalty: 1,
    };
    expect(isConfigurationCustom(standardT20)).toBe(false);

    const modifiedT20: MatchRules = {
      ...standardT20,
      oversPerSide: 15,
    };
    expect(isConfigurationCustom(modifiedT20)).toBe(true);
  });

  it("29. Edge: Normalization safely handles string inputs, NaN, and undefined gracefully", () => {
    const messyInput = {
      formatPreset: "CUSTOM",
      oversPerSide: "20" as any,
      maxOversPerBowler: "4" as any,
      playersPerTeam: "11" as any,
      maxDismissals: undefined,
      lastManStanding: "true" as any,
      noBallPenalty: "1" as any,
      widePenalty: "1" as any,
    };
    const res = validateMatchRules(messyInput);
    expect(res.valid).toBe(true);
    expect(res.normalizedRules.oversPerSide).toBe(20);
    expect(res.normalizedRules.maxOversPerBowler).toBe(4);
    expect(res.normalizedRules.playersPerTeam).toBe(11);
  });

  it("30. Edge: deriveStandardBowlerLimit calculates minimum practical bowler limits correctly", () => {
    expect(deriveStandardBowlerLimit(4)).toBe(1);
    expect(deriveStandardBowlerLimit(5)).toBe(1);
    expect(deriveStandardBowlerLimit(10)).toBe(2);
    expect(deriveStandardBowlerLimit(15)).toBe(3);
    expect(deriveStandardBowlerLimit(20)).toBe(4);
    expect(deriveStandardBowlerLimit(50)).toBe(10);
  });
});
