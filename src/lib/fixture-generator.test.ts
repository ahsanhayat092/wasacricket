import { describe, it, expect } from "vitest";
import {
  generateRoundRobinPairings,
  generateTournamentSchedule,
  FORMAT_PRESETS,
} from "./fixture-generator";

describe("Fixture Generator", () => {
  it("generates correct number of single round-robin pairings for 6 teams (15 matches)", () => {
    const teams = ["T1", "T2", "T3", "T4", "T5", "T6"];
    const pairings = generateRoundRobinPairings(teams, false);

    expect(pairings.length).toBe(15);
    // Each round should have 3 matches across 5 rounds
    const rounds = new Set(pairings.map((p) => p.round));
    expect(rounds.size).toBe(5);
  });

  it("handles odd number of teams with bye correctly (5 teams = 10 matches)", () => {
    const teams = ["T1", "T2", "T3", "T4", "T5"];
    const pairings = generateRoundRobinPairings(teams, false);

    expect(pairings.length).toBe(10);
  });

  it("generates double round robin correctly (4 teams = 12 matches)", () => {
    const teams = ["T1", "T2", "T3", "T4"];
    const pairings = generateRoundRobinPairings(teams, true);

    expect(pairings.length).toBe(12);
  });

  it("generates complete schedule with proper times and days", () => {
    const teams = [
      { id: "1", name: "Wolves" },
      { id: "2", name: "Lions" },
      { id: "3", name: "Tigers" },
      { id: "4", name: "Falcons" },
    ];

    const schedule = generateTournamentSchedule({
      teams,
      startDate: "2026-09-01",
      dailyStartTime: "20:00",
      matchDurationMinutes: 45,
      matchesPerDay: 2,
    });

    expect(schedule.length).toBe(6);
    expect(schedule[0].matchNumber).toBe(1);
    expect(schedule[0].time).toBe("8:00 PM");
    expect(schedule[1].time).toBe("8:45 PM");
    // Day 2 (since matchesPerDay = 2)
    expect(schedule[2].matchNumber).toBe(3);
    expect(schedule[2].time).toBe("8:00 PM");
  });

  it("has valid format presets", () => {
    expect(FORMAT_PRESETS.T20.oversPerSide).toBe(20);
    expect(FORMAT_PRESETS.TAPE_BALL_INDOOR.oversPerSide).toBe(4);
    expect(FORMAT_PRESETS.T10.maxOverPerBowler).toBe(2);
  });
});
