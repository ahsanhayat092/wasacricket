import { describe, it, expect } from "vitest";
import {
  oversToBalls,
  ballsToOversText,
  runRate,
  computeNrr,
  effectiveNrrBalls,
  requiredRunRate,
  determineOutcome,
  fmtNrr,
} from "./cricket";

describe("oversToBalls", () => {
  it("converts whole overs", () => {
    expect(oversToBalls(10)).toBe(60);
    expect(oversToBalls(0)).toBe(0);
    expect(oversToBalls(20)).toBe(120);
  });

  it("converts fractional overs", () => {
    expect(oversToBalls(8.4)).toBe(52);
    expect(oversToBalls(0.1)).toBe(1);
    expect(oversToBalls(9.5)).toBe(59);
  });

  it("rejects invalid ball counts (.6, .7, etc.)", () => {
    expect(() => oversToBalls(8.6)).toThrow();
    expect(() => oversToBalls(8.9)).toThrow();
  });
});

describe("ballsToOversText", () => {
  it("formats balls correctly", () => {
    expect(ballsToOversText(60)).toBe("10.0");
    expect(ballsToOversText(52)).toBe("8.4");
    expect(ballsToOversText(0)).toBe("0.0");
    expect(ballsToOversText(1)).toBe("0.1");
  });
});

describe("runRate", () => {
  it("calculates runs per 6 balls", () => {
    expect(runRate(100, 60)).toBe(10);
    expect(runRate(0, 60)).toBe(0);
    expect(runRate(100, 0)).toBe(0);
  });
});

describe("computeNrr", () => {
  it("calculates correct NRR", () => {
    const nrr = computeNrr({
      runsFor: 100,
      ballsFor: 60,
      runsAgainst: 80,
      ballsAgainst: 60,
    });
    expect(nrr).toBeCloseTo(2.0, 4);
  });

  it("formats NRR with leading sign", () => {
    expect(fmtNrr(2.0)).toBe("+2.000");
    expect(fmtNrr(-0.45)).toBe("-0.450");
    expect(fmtNrr(0)).toBe("+0.000");
  });
});

describe("effectiveNrrBalls", () => {
  it("uses full quota when all out", () => {
    expect(effectiveNrrBalls(30, true, 60)).toBe(60);
  });

  it("uses actual balls when not all out", () => {
    expect(effectiveNrrBalls(45, false, 60)).toBe(45);
  });
});

describe("requiredRunRate", () => {
  it("calculates RRR accurately", () => {
    expect(requiredRunRate(100, 40, 60, 30)).toBe(12);
  });
});

describe("determineOutcome", () => {
  it("detects win by runs", () => {
    const outcome = determineOutcome({
      innings1Runs: 100,
      innings1Balls: 60,
      innings1AllOut: false,
      innings1Wickets: 4,
      innings2Runs: 85,
      innings2Balls: 60,
      innings2AllOut: false,
      innings2Wickets: 6,
    });
    expect(outcome).toEqual({
      kind: "WIN",
      winner: "TEAM_A",
      margin: "15 runs",
    });
  });

  it("detects win by wickets", () => {
    const outcome = determineOutcome({
      innings1Runs: 100,
      innings1Balls: 60,
      innings1AllOut: false,
      innings1Wickets: 4,
      innings2Runs: 102,
      innings2Balls: 50,
      innings2AllOut: false,
      innings2Wickets: 3,
    });
    expect(outcome).toEqual({
      kind: "WIN",
      winner: "TEAM_B",
      margin: "2 wickets",
    });
  });

  it("detects tie", () => {
    const outcome = determineOutcome({
      innings1Runs: 100,
      innings1Balls: 60,
      innings1AllOut: false,
      innings1Wickets: 4,
      innings2Runs: 100,
      innings2Balls: 60,
      innings2AllOut: false,
      innings2Wickets: 5,
    });
    expect(outcome).toEqual({ kind: "TIE" });
  });
});
