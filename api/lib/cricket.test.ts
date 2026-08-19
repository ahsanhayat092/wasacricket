import { describe, it, expect } from "vitest";
import {
  oversToBalls,
  ballsToOversText,
  runRate,
  computeNrr,
  effectiveNrrBalls,
  requiredRunRate,
  determineOutcome,
} from "./cricket";

describe("overs/balls conversion", () => {
  it("converts overs to balls correctly", () => {
    expect(oversToBalls(8.1)).toBe(49);
    expect(oversToBalls(8.2)).toBe(50);
    expect(oversToBalls(8.3)).toBe(51);
    expect(oversToBalls(8.4)).toBe(52);
    expect(oversToBalls(8.5)).toBe(53);
    expect(oversToBalls(9.0)).toBe(54);
    expect(oversToBalls(10.0)).toBe(60);
    expect(oversToBalls(0.0)).toBe(0);
  });

  it("rejects invalid overs", () => {
    expect(() => oversToBalls(8.6)).toThrow();
    expect(() => oversToBalls(8.9)).toThrow();
  });

  it("formats balls as overs text", () => {
    expect(ballsToOversText(50)).toBe("8.2");
    expect(ballsToOversText(60)).toBe("10.0");
    expect(ballsToOversText(6)).toBe("1.0");
    expect(ballsToOversText(0)).toBe("0.0");
  });
});

describe("run rate / NRR", () => {
  it("computes run rate from balls", () => {
    // 92 runs off 50 balls = 11.04 rpo
    expect(runRate(92, 50)).toBeCloseTo(11.04, 5);
    expect(runRate(0, 0)).toBe(0);
  });

  it("computes NRR as aggregate RR difference", () => {
    // Team scores 60 off 60 balls (all out in 8.2 -> full 10 over quota),
    // concedes 101 off 52 balls.
    const nrr = computeNrr({
      runsFor: 60,
      ballsFor: 60, // all-out rule: full quota
      runsAgainst: 101,
      ballsAgainst: 52, // successful chase: actual balls
    });
    // RR for = 6.0, RR against = 101/52*6 = 11.6538..., NRR = -5.6538
    expect(nrr).toBeCloseTo(6 - (101 / 52) * 6, 8);
  });
});

describe("effectiveNrrBalls (ICC all-out rule)", () => {
  it("uses full quota when all out early", () => {
    // 60 all out in 8.2 (50 balls) of a 10-over match -> 60 balls
    expect(effectiveNrrBalls(50, true, 60)).toBe(60);
  });

  it("uses actual balls for a successful chase", () => {
    // 101/3 in 8.4 (52 balls) chasing -> 52 balls
    expect(effectiveNrrBalls(52, false, 60)).toBe(52);
  });

  it("never exceeds quota", () => {
    expect(effectiveNrrBalls(65, false, 60)).toBe(60);
  });
});

describe("requiredRunRate", () => {
  it("computes RRR", () => {
    // target 93, current 75 off 50 balls, quota 60 -> 18 off 10 -> 10.80
    expect(requiredRunRate(93, 75, 60, 50)).toBeCloseTo(10.8, 5);
  });
});

describe("determineOutcome", () => {
  it("win by runs", () => {
    expect(
      determineOutcome({
        innings1Runs: 92,
        innings1Balls: 60,
        innings1AllOut: false,
        innings1Wickets: 6,
        innings2Runs: 75,
        innings2Balls: 60,
        innings2AllOut: false,
        innings2Wickets: 4,
      }),
    ).toEqual({ kind: "WIN", winner: "TEAM_A", margin: "17 runs" });
  });

  it("win by wickets", () => {
    expect(
      determineOutcome({
        innings1Runs: 100,
        innings1Balls: 60,
        innings1AllOut: false,
        innings1Wickets: 8,
        innings2Runs: 101,
        innings2Balls: 52,
        innings2AllOut: false,
        innings2Wickets: 3,
      }),
    ).toEqual({ kind: "WIN", winner: "TEAM_B", margin: "7 wickets" });
  });

  it("tie", () => {
    expect(
      determineOutcome({
        innings1Runs: 100,
        innings1Balls: 60,
        innings1AllOut: false,
        innings1Wickets: 5,
        innings2Runs: 100,
        innings2Balls: 60,
        innings2AllOut: true,
        innings2Wickets: 10,
      }).kind,
    ).toBe("TIE");
  });

  it("no result when only one innings", () => {
    expect(
      determineOutcome({
        innings1Runs: 100,
        innings1Balls: 60,
        innings1AllOut: false,
        innings1Wickets: 5,
        innings2Runs: null,
        innings2Balls: null,
        innings2AllOut: false,
        innings2Wickets: null,
      }).kind,
    ).toBe("NO_RESULT");
  });
});
