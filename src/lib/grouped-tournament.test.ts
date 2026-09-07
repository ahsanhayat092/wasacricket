import { describe, it, expect, vi } from "vitest";
import { generateGroupedTournamentSchedule } from "./fixture-generator";
import { stageBadgeText, stageTeamPlaceholders } from "./cricket";
import { syncKnockoutFixtures } from "./tournament-logic";
import type { Match, Tournament } from "./firestore";

// Mock firestore functions
vi.mock("firebase/firestore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/firestore")>();
  return {
    ...actual,
    addDoc: vi.fn(async (_col, data) => ({ id: `new_${data.stage}` })),
    updateDoc: vi.fn(async () => {}),
  };
});

describe("Grouped Tournament System (World Cup Format)", () => {
  describe("Group Schedule Generator", () => {
    it("generates intra-group round-robin fixtures tagged with groupName", () => {
      const teams = [
        { id: "a1", name: "Pakistan", groupName: "A" },
        { id: "a2", name: "India", groupName: "A" },
        { id: "a3", name: "Australia", groupName: "A" },
        { id: "b1", name: "South Africa", groupName: "B" },
        { id: "b2", name: "England", groupName: "B" },
        { id: "b3", name: "New Zealand", groupName: "B" },
      ];

      const fixtures = generateGroupedTournamentSchedule({
        teams,
        startDate: "2026-09-10",
        dailyStartTime: "18:00",
        matchDurationMinutes: 60,
        matchesPerDay: 2,
        venue: "National Cricket Ground",
      });

      // 3 teams in A -> 3 matches (a1 v a2, a1 v a3, a2 v a3)
      // 3 teams in B -> 3 matches (b1 v b2, b1 v b3, b2 v b3)
      // Total = 6 group matches
      expect(fixtures.length).toBe(6);

      const groupAFixtures = fixtures.filter((f) => f.groupName === "A");
      const groupBFixtures = fixtures.filter((f) => f.groupName === "B");

      expect(groupAFixtures.length).toBe(3);
      expect(groupBFixtures.length).toBe(3);

      // Verify that NO cross-group matches occur in league stage
      for (const fix of groupAFixtures) {
        expect(["a1", "a2", "a3"]).toContain(fix.teamAId);
        expect(["a1", "a2", "a3"]).toContain(fix.teamBId);
        expect(fix.stage).toBe("LEAGUE");
      }

      for (const fix of groupBFixtures) {
        expect(["b1", "b2", "b3"]).toContain(fix.teamAId);
        expect(["b1", "b2", "b3"]).toContain(fix.teamBId);
        expect(fix.stage).toBe("LEAGUE");
      }
    });

    it("assigns sequential match numbers and valid times/dates", () => {
      const teams = [
        { id: "a1", name: "Team A1", groupName: "A" },
        { id: "a2", name: "Team A2", groupName: "A" },
        { id: "b1", name: "Team B1", groupName: "B" },
        { id: "b2", name: "Team B2", groupName: "B" },
      ];

      const fixtures = generateGroupedTournamentSchedule({
        teams,
        startDate: "2026-09-01",
        dailyStartTime: "20:00",
        matchDurationMinutes: 45,
        matchesPerDay: 2,
      });

      expect(fixtures.length).toBe(2);
      expect(fixtures[0].matchNumber).toBe(1);
      expect(fixtures[1].matchNumber).toBe(2);
      expect(fixtures[0].time).toBe("8:00 PM");
      expect(fixtures[1].time).toBe("8:45 PM");
    });
  });

  describe("Stage Badges & Placeholders", () => {
    it("displays group names for league matches", () => {
      expect(stageBadgeText("LEAGUE", 1, "A")).toBe("Group A · Match #1");
      expect(stageBadgeText("LEAGUE", 4, "B")).toBe("Group B · Match #4");
      expect(stageBadgeText("LEAGUE", 2)).toBe("Match #2");
    });

    it("displays group crossover labels for knockout stages", () => {
      expect(stageBadgeText("SEMI_1", undefined, undefined, true)).toBe("🎯 Semi-Final 1 (A1 vs B2)");
      expect(stageBadgeText("SEMI_2", undefined, undefined, true)).toBe("🎯 Semi-Final 2 (B1 vs A2)");
      expect(stageBadgeText("FINAL", undefined, undefined, true)).toBe("🏆 Grand Final");
    });

    it("provides group-aware team placeholders", () => {
      expect(stageTeamPlaceholders("SEMI_1", true)).toEqual({
        teamA: "TBD (Winner Group A)",
        teamB: "TBD (Runner-up Group B)",
      });
      expect(stageTeamPlaceholders("SEMI_2", true)).toEqual({
        teamA: "TBD (Winner Group B)",
        teamB: "TBD (Runner-up Group A)",
      });
      expect(stageTeamPlaceholders("FINAL", true)).toEqual({
        teamA: "TBD (Winner SF1)",
        teamB: "TBD (Winner SF2)",
      });
    });
  });

  describe("Group Knockout Synchronization Engine", () => {
    const groupMatchesCompleted: Match[] = [
      { id: "m1", matchNumber: 1, stage: "LEAGUE", groupName: "A", status: "COMPLETED", teamAId: "pak", teamBId: "ind" } as Match,
      { id: "m2", matchNumber: 2, stage: "LEAGUE", groupName: "B", status: "COMPLETED", teamAId: "sa", teamBId: "eng" } as Match,
    ];

    const groupStandings = [
      { teamId: "pak", groupName: "A", position: 1 }, // A1
      { teamId: "ind", groupName: "A", position: 2 }, // A2
      { teamId: "sa", groupName: "B", position: 1 },  // B1
      { teamId: "eng", groupName: "B", position: 2 }, // B2
    ];

    it("keeps knockout matches as TBD while group matches are still UPCOMING", async () => {
      const incompleteGroupMatches: Match[] = [
        { id: "m1", matchNumber: 1, stage: "LEAGUE", groupName: "A", status: "COMPLETED", teamAId: "pak", teamBId: "ind" } as Match,
        { id: "m2", matchNumber: 2, stage: "LEAGUE", groupName: "B", status: "UPCOMING", teamAId: "sa", teamBId: "eng" } as Match,
      ];

      const semi1: Match = { id: "m_sf1", matchNumber: 3, stage: "SEMI_1", status: "UPCOMING", teamAId: null, teamBId: null } as Match;
      const semi2: Match = { id: "m_sf2", matchNumber: 4, stage: "SEMI_2", status: "UPCOMING", teamAId: null, teamBId: null } as Match;
      const finalMatch: Match = { id: "m_fn", matchNumber: 5, stage: "FINAL", status: "UPCOMING", teamAId: null, teamBId: null } as Match;

      const tournament: Tournament = {
        id: "t_wc",
        stageFormat: "GROUPS_AND_KNOCKOUT",
        groupPlayoffFormat: "GROUP_SEMI_FINALS",
        teamsPerGroupAdvance: 2,
      } as Tournament;

      await syncKnockoutFixtures([...incompleteGroupMatches, semi1, semi2, finalMatch], groupStandings, tournament);

      // Should remain null because group stage isn't completed
      expect(semi1.teamAId).toBeNull();
      expect(semi1.teamBId).toBeNull();
      expect(semi2.teamAId).toBeNull();
      expect(semi2.teamBId).toBeNull();
      expect(finalMatch.teamAId).toBeNull();
      expect(finalMatch.teamBId).toBeNull();
    });

    it("auto-populates SF1 (A1 vs B2) and SF2 (B1 vs A2) once all group matches complete", async () => {
      const semi1: Match = { id: "m_sf1", matchNumber: 3, stage: "SEMI_1", status: "UPCOMING", teamAId: null, teamBId: null } as Match;
      const semi2: Match = { id: "m_sf2", matchNumber: 4, stage: "SEMI_2", status: "UPCOMING", teamAId: null, teamBId: null } as Match;
      const finalMatch: Match = { id: "m_fn", matchNumber: 5, stage: "FINAL", status: "UPCOMING", teamAId: null, teamBId: null } as Match;

      const tournament: Tournament = {
        id: "t_wc",
        stageFormat: "GROUPS_AND_KNOCKOUT",
        groupPlayoffFormat: "GROUP_SEMI_FINALS",
        teamsPerGroupAdvance: 2,
      } as Tournament;

      await syncKnockoutFixtures([...groupMatchesCompleted, semi1, semi2, finalMatch], groupStandings, tournament);

      // SF1: A1 (pak) vs B2 (eng)
      expect(semi1.teamAId).toBe("pak");
      expect(semi1.teamBId).toBe("eng");

      // SF2: B1 (sa) vs A2 (ind)
      expect(semi2.teamAId).toBe("sa");
      expect(semi2.teamBId).toBe("ind");

      // Final remains TBD until Semi-Finals finish
      expect(finalMatch.teamAId).toBeNull();
      expect(finalMatch.teamBId).toBeNull();
    });

    it("populates Grand Final with winners of SF1 and SF2", async () => {
      const completedSF1: Match = {
        id: "m_sf1",
        matchNumber: 3,
        stage: "SEMI_1",
        status: "COMPLETED",
        teamAId: "pak",
        teamBId: "eng",
        winningTeamId: "pak", // Pakistan wins SF1
      } as Match;

      const completedSF2: Match = {
        id: "m_sf2",
        matchNumber: 4,
        stage: "SEMI_2",
        status: "COMPLETED",
        teamAId: "sa",
        teamBId: "ind",
        winningTeamId: "sa", // South Africa wins SF2
      } as Match;

      const finalMatch: Match = {
        id: "m_fn",
        matchNumber: 5,
        stage: "FINAL",
        status: "UPCOMING",
        teamAId: null,
        teamBId: null,
      } as Match;

      const tournament: Tournament = {
        id: "t_wc",
        stageFormat: "GROUPS_AND_KNOCKOUT",
        groupPlayoffFormat: "GROUP_SEMI_FINALS",
        teamsPerGroupAdvance: 2,
      } as Tournament;

      await syncKnockoutFixtures(
        [...groupMatchesCompleted, completedSF1, completedSF2, finalMatch],
        groupStandings,
        tournament,
      );

      // Final should now be Pakistan vs South Africa!
      expect(finalMatch.teamAId).toBe("pak");
      expect(finalMatch.teamBId).toBe("sa");
    });

    it("supports GROUP_DIRECT_FINAL pairing A1 directly against B1", async () => {
      const finalMatch: Match = {
        id: "m_fn",
        matchNumber: 3,
        stage: "FINAL",
        status: "UPCOMING",
        teamAId: null,
        teamBId: null,
      } as Match;

      const tournament: Tournament = {
        id: "t_wc",
        stageFormat: "GROUPS_AND_KNOCKOUT",
        groupPlayoffFormat: "GROUP_DIRECT_FINAL",
        teamsPerGroupAdvance: 1,
      } as Tournament;

      await syncKnockoutFixtures([...groupMatchesCompleted, finalMatch], groupStandings, tournament);

      // Direct Grand Final: A1 (pak) vs B1 (sa)
      expect(finalMatch.teamAId).toBe("pak");
      expect(finalMatch.teamBId).toBe("sa");
    });
  });
});
