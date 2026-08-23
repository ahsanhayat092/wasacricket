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
  getInningsFallOfWickets,
  getInningsPartnerships,
  getInningsOverWiseStats,
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
      margin: "3 wickets",
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

describe("getInningsFallOfWickets", () => {
  it("returns explicit fall of wickets when stored", () => {
    const explicit = [
      {
        wicketNumber: 1,
        runs: 18,
        balls: 10,
        overs: "1.4",
        playerId: "p1",
        playerName: "Ali",
        dismissal: "c & b Bowler",
      },
    ];
    const fow = getInningsFallOfWickets({
      runs: 50,
      wickets: 1,
      balls: 24,
      fallOfWickets: explicit,
      batting: [],
    });
    expect(fow).toHaveLength(1);
    expect(fow[0].runs).toBe(18);
    expect(fow[0].playerName).toBe("Ali");
  });

  it("derives fallback fall of wickets from batting scores", () => {
    const fow = getInningsFallOfWickets({
      runs: 45,
      wickets: 2,
      balls: 24,
      batting: [
        {
          playerId: "p1",
          playerName: "Batter 1",
          runs: 12,
          balls: 8,
          isOut: true,
          dismissal: "bowled",
          battingOrder: 1,
        },
        {
          playerId: "p2",
          playerName: "Batter 2",
          runs: 25,
          balls: 12,
          isOut: true,
          dismissal: "caught",
          battingOrder: 2,
        },
        {
          playerId: "p3",
          playerName: "Batter 3",
          runs: 6,
          balls: 4,
          isOut: false,
          battingOrder: 3,
        },
      ],
    });
    expect(fow).toHaveLength(2);
    expect(fow[0].wicketNumber).toBe(1);
    expect(fow[0].playerName).toBe("Batter 1");
    expect(fow[1].wicketNumber).toBe(2);
    expect(fow[1].playerName).toBe("Batter 2");
  });
});

describe("getInningsPartnerships", () => {
  it("returns explicit partnerships when stored", () => {
    const explicit = [
      {
        wicketNumber: 1,
        player1Id: "p1",
        player1Name: "Batter 1",
        player1Runs: 15,
        player1Balls: 8,
        player2Id: "p2",
        player2Name: "Batter 2",
        player2Runs: 20,
        player2Balls: 10,
        totalRuns: 35,
        totalBalls: 18,
        isUnbroken: false,
      },
    ];
    const stands = getInningsPartnerships({
      runs: 35,
      wickets: 1,
      balls: 18,
      partnerships: explicit,
      batting: [],
    });
    expect(stands).toHaveLength(1);
    expect(stands[0].totalRuns).toBe(35);
  });

  it("derives fallback partnerships from batting order", () => {
    const stands = getInningsPartnerships({
      runs: 40,
      wickets: 1,
      balls: 20,
      batting: [
        {
          playerId: "p1",
          playerName: "Batter 1",
          runs: 15,
          balls: 8,
          isOut: true,
          battingOrder: 1,
        },
        {
          playerId: "p2",
          playerName: "Batter 2",
          runs: 20,
          balls: 10,
          isOut: false,
          battingOrder: 2,
        },
        {
          playerId: "p3",
          playerName: "Batter 3",
          runs: 5,
          balls: 2,
          isOut: false,
          battingOrder: 3,
        },
      ],
    });
    expect(stands.length).toBeGreaterThanOrEqual(1);
    expect(stands[0].wicketNumber).toBe(1);
    expect(stands[0].player1Name).toBe("Batter 1");
    expect(stands[0].player2Name).toBe("Batter 2");
  });
});

describe("getInningsOverWiseStats", () => {
  it("accurately calculates over stats from delivery feed", () => {
    // 6 legal balls in Over 1: 1, 4, 0, W, 6, 1 = 12 runs, 1 wicket
    // 3 legal balls in Over 2: 2, 4, 1 = 7 runs
    const recentBalls = ["1", "4", "0", "W", "6", "1", "2", "4", "1"];
    const overs = getInningsOverWiseStats({
      runs: 19,
      wickets: 1,
      balls: 9,
      recentBalls,
    });

    expect(overs).toHaveLength(2);
    expect(overs[0].overNumber).toBe(1);
    expect(overs[0].runs).toBe(12);
    expect(overs[0].wickets).toBe(1);
    expect(overs[0].cumulativeRuns).toBe(12);

    expect(overs[1].overNumber).toBe(2);
    expect(overs[1].runs).toBe(7);
    expect(overs[1].wickets).toBe(0);
    expect(overs[1].cumulativeRuns).toBe(19);
  });

  it("handles extras like wides and no balls properly", () => {
    // Over 1: 1, Wd, 4, Nb+4, 0, 0, 1 (6 legal balls + 2 illegal balls)
    // Runs: 1 + 1(Wd) + 4 + 5(Nb+4) + 0 + 0 + 1 = 12 runs
    const recentBalls = ["1", "Wd", "4", "Nb+4", "0", "0", "1"];
    const overs = getInningsOverWiseStats({
      runs: 12,
      wickets: 0,
      balls: 6,
      recentBalls,
    });

    expect(overs).toHaveLength(1);
    expect(overs[0].runs).toBe(12);
    expect(overs[0].extras).toBe(2);
  });

  it("provides fallback breakdown when recentBalls is not present", () => {
    const overs = getInningsOverWiseStats(
      {
        runs: 40,
        wickets: 2,
        balls: 24, // 4 overs
      },
      4,
    );

    expect(overs).toHaveLength(4);
    expect(overs[3].cumulativeRuns).toBe(40);
  });
});


