import { describe, it, expect, beforeEach } from "vitest";
import {
  levenshteinDistance,
  tokenize,
  calculateMatchScore,
  WasaSearchEngine,
} from "./search-engine";

describe("WasaSearchEngine & Tokenizer", () => {
  it("calculates Levenshtein distance correctly", () => {
    expect(levenshteinDistance("babar", "babar")).toBe(0);
    expect(levenshteinDistance("babar", "babur")).toBe(1);
    expect(levenshteinDistance("rashid", "rshid")).toBe(1);
    expect(levenshteinDistance("cricket", "football")).toBe(8);
  });

  it("tokenizes sentences and names into normalized tokens", () => {
    expect(tokenize("Babar Azam - All-Rounder")).toEqual(["babar", "azam", "all", "rounder"]);
    expect(tokenize("")).toEqual([]);
  });

  it("scores exact, prefix, substring, and fuzzy matches accurately", () => {
    expect(calculateMatchScore("Babar Azam", "Babar Azam")).toBe(100);
    expect(calculateMatchScore("Babar Azam", "Babar")).toBeGreaterThanOrEqual(70);
    expect(calculateMatchScore("Rashid Khan", "Rshid")).toBeGreaterThanOrEqual(15);
  });

  describe("Engine Search Operations", () => {
    let engine: WasaSearchEngine;

    beforeEach(() => {
      engine = new WasaSearchEngine();
      engine.indexData({
        players: [
          {
            id: "p1",
            name: "Babar Azam",
            role: "Batter",
            jerseyNumber: 56,
            tournamentId: "t_lahore",
            teamName: "Lahore Lions",
          },
          {
            id: "p2",
            name: "Rashid Jameel",
            role: "All-Rounder",
            jerseyNumber: 10,
            tournamentId: "t_lahore",
            teamName: "Lahore Lions",
          },
          {
            id: "p3",
            name: "Usama Tahir",
            role: "Bowler",
            jerseyNumber: 99,
            tournamentId: "t_karachi",
            teamName: "Karachi Kings",
          },
        ],
        teams: [
          { id: "team1", name: "Lahore Lions", shortName: "LIO", tournamentId: "t_lahore" },
          { id: "team2", name: "Karachi Kings", shortName: "KHI", tournamentId: "t_karachi" },
        ],
        matches: [
          {
            id: "m1",
            matchNumber: 1,
            stage: "LEAGUE",
            status: "LIVE",
            teamAName: "Lahore Lions",
            teamBName: "Karachi Kings",
            tournamentId: "t_lahore",
          },
        ],
        tournaments: [
          { id: "t_lahore", name: "Lahore Premier Cup", slug: "lahore-cup" },
          { id: "t_karachi", name: "Karachi Super League", slug: "karachi-league" },
        ],
      });
    });

    it("finds players by exact name", () => {
      const res = engine.search("Babar");
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].title).toBe("Babar Azam");
      expect(res[0].type).toBe("player");
    });

    it("finds players with typos via fuzzy matching", () => {
      const res = engine.search("Rshid Jameel");
      expect(res.length).toBeGreaterThan(0);
      expect(res.some((r) => r.title === "Rashid Jameel")).toBe(true);
    });

    it("supports tournament-scoped search filtering", () => {
      const resLahore = engine.search("Usama", { tournamentId: "t_lahore" });
      expect(resLahore.length).toBe(0);

      const resKarachi = engine.search("Usama", { tournamentId: "t_karachi" });
      expect(resKarachi.length).toBe(1);
      expect(resKarachi[0].title).toBe("Usama Tahir");
    });

    it("finds teams by short name or full name", () => {
      const resShort = engine.search("LIO");
      expect(resShort.some((r) => r.title === "Lahore Lions")).toBe(true);
    });

    it("finds matches by team matchup", () => {
      const res = engine.search("Lions vs Kings");
      expect(res.some((r) => r.type === "match")).toBe(true);
    });
  });
});
