import { describe, it, expect } from "vitest";
import {
  formatTournamentDateRange,
  getTournamentDayNumber,
  formatMatchDayWithDayNumber,
} from "./pdf-export";

describe("PDF Fixtures Export - Day Resolution & Formatting", () => {
  const sampleMatches = [
    { matchNumber: 1, day: "MONDAY", date: "2026-09-14" },
    { matchNumber: 2, day: "MONDAY", date: "2026-09-14" },
    { matchNumber: 3, day: "MONDAY", date: "2026-09-14" },
    { matchNumber: 4, day: "MONDAY", date: "2026-09-14" },
    { matchNumber: 5, day: "MONDAY", date: "2026-09-14" },
    { matchNumber: 6, day: "MONDAY", date: "2026-09-14" },
    { matchNumber: 7, day: "TUESDAY", date: "2026-09-15" },
    { matchNumber: 8, day: "TUESDAY", date: "2026-09-15" },
    { matchNumber: 9, day: "TUESDAY", date: "2026-09-15" },
    { matchNumber: 10, day: "TUESDAY", date: "2026-09-15" },
    { matchNumber: 11, day: "TUESDAY", date: "2026-09-15" },
    { matchNumber: 12, day: "TUESDAY", date: "2026-09-15" },
  ];

  it("calculates multi-day tournament date range with day count", () => {
    const range = formatTournamentDateRange(sampleMatches);
    expect(range).toBe("14 September 2026 to 15 September 2026 (2 Days)");
  });

  it("calculates single-day tournament date range without multi-day suffix", () => {
    const singleDayMatches = [
      { matchNumber: 1, day: "SATURDAY", date: "2026-09-19" },
      { matchNumber: 2, day: "SATURDAY", date: "2026-09-19" },
    ];
    const range = formatTournamentDateRange(singleDayMatches);
    expect(range).toBe("19 September 2026");
  });

  it("resolves correct tournament day number for each date", () => {
    expect(getTournamentDayNumber("2026-09-14", "MONDAY", sampleMatches)).toBe(1);
    expect(getTournamentDayNumber("2026-09-15", "TUESDAY", sampleMatches)).toBe(2);
  });

  it("formats match day and date with Day 1 / Day 2 prefix", () => {
    const day1Formatted = formatMatchDayWithDayNumber(
      "MONDAY",
      "2026-09-14",
      sampleMatches
    );
    expect(day1Formatted).toBe("Day 1 - Mon, 14 September 2026");

    const day2Formatted = formatMatchDayWithDayNumber(
      "TUESDAY",
      "2026-09-15",
      sampleMatches
    );
    expect(day2Formatted).toBe("Day 2 - Tue, 15 September 2026");
  });

  it("avoids duplicate Day prefix if already present", () => {
    const formatted = formatMatchDayWithDayNumber(
      "Day 1",
      "Day 1 - Mon, 14 September 2026",
      sampleMatches
    );
    expect(formatted).toBe("Day 1 - Mon, 14 September 2026");
  });
});
