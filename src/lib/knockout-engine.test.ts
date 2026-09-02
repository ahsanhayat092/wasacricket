import { describe, it, expect, vi } from "vitest";
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

describe("Tournament Knockout Progression Engine", () => {
  it("provides correct stage badge text and team placeholders for all stages", () => {
    expect(stageBadgeText("FINAL")).toBe("🏆 Grand Final");
    expect(stageBadgeText("PLAYOFF")).toBe("⚔️ Playoff (Rank 2 vs 3)");
    expect(stageBadgeText("QUALIFIER_1")).toBe("🔥 Qualifier 1 (Rank 1 vs 2)");
    expect(stageBadgeText("ELIMINATOR")).toBe("⚔️ Eliminator (Rank 3 vs 4)");
    expect(stageBadgeText("QUALIFIER_2")).toBe("⚡ Qualifier 2");
    expect(stageBadgeText("SEMI_1")).toBe("🎯 Semi-Final 1 (Rank 1 vs 4)");
    expect(stageBadgeText("SEMI_2")).toBe("🎯 Semi-Final 2 (Rank 2 vs 3)");
    expect(stageBadgeText("LEAGUE", 5)).toBe("Match #5");

    expect(stageTeamPlaceholders("FINAL")).toEqual({ teamA: "TBD (Finalist 1)", teamB: "TBD (Finalist 2)" });
    expect(stageTeamPlaceholders("QUALIFIER_1")).toEqual({ teamA: "TBD (Rank 1)", teamB: "TBD (Rank 2)" });
    expect(stageTeamPlaceholders("ELIMINATOR")).toEqual({ teamA: "TBD (Rank 3)", teamB: "TBD (Rank 4)" });
    expect(stageTeamPlaceholders("SEMI_1")).toEqual({ teamA: "TBD (Rank 1)", teamB: "TBD (Rank 4)" });
  });

  const completedLeagueMatches: Match[] = [
    { id: "m1", matchNumber: 1, stage: "LEAGUE", status: "COMPLETED", teamAId: "t1", teamBId: "t2" } as Match,
    { id: "m2", matchNumber: 2, stage: "LEAGUE", status: "COMPLETED", teamAId: "t3", teamBId: "t4" } as Match,
  ];

  const sortedStandings = [
    { teamId: "t1" }, // Rank 1
    { teamId: "t2" }, // Rank 2
    { teamId: "t3" }, // Rank 3
    { teamId: "t4" }, // Rank 4
  ];

  it("handles DIRECT_TOP2 by pairing Rank 1 and Rank 2 in Grand Final", async () => {
    const finalMatch: Match = {
      id: "m_final",
      matchNumber: 3,
      stage: "FINAL",
      status: "UPCOMING",
      teamAId: null,
      teamBId: null,
    } as Match;

    const allMatches = [...completedLeagueMatches, finalMatch];
    const tournament = { id: "tourney_1", playoffFormat: "DIRECT_TOP2" } as Tournament;

    await syncKnockoutFixtures(allMatches, sortedStandings, tournament);

    expect(finalMatch.teamAId).toBe("t1");
    expect(finalMatch.teamBId).toBe("t2");
  });

  it("handles PAGE_PLAYOFF_TOP3 by pairing Rank 2 vs 3, and feeding winner to Rank 1", async () => {
    const playoffMatch: Match = {
      id: "m_playoff",
      matchNumber: 3,
      stage: "PLAYOFF",
      status: "COMPLETED",
      teamAId: "t2",
      teamBId: "t3",
      winningTeamId: "t2", // Team 2 wins
    } as Match;

    const finalMatch: Match = {
      id: "m_final",
      matchNumber: 4,
      stage: "FINAL",
      status: "UPCOMING",
      teamAId: null,
      teamBId: null,
    } as Match;

    const allMatches = [...completedLeagueMatches, playoffMatch, finalMatch];
    const tournament = { id: "tourney_1", playoffFormat: "PAGE_PLAYOFF_TOP3" } as Tournament;

    await syncKnockoutFixtures(allMatches, sortedStandings, tournament);

    expect(finalMatch.teamAId).toBe("t1");
    expect(finalMatch.teamBId).toBe("t2");
  });

  it("handles IPL_TOP4 through Q1, Eliminator, Q2, and Final progression", async () => {
    const q1: Match = {
      id: "m_q1",
      matchNumber: 3,
      stage: "QUALIFIER_1",
      status: "COMPLETED",
      teamAId: "t1",
      teamBId: "t2",
      winningTeamId: "t1", // t1 wins to Final, t2 goes to Q2
    } as Match;

    const elim: Match = {
      id: "m_elim",
      matchNumber: 4,
      stage: "ELIMINATOR",
      status: "COMPLETED",
      teamAId: "t3",
      teamBId: "t4",
      winningTeamId: "t3", // t3 wins to Q2, t4 eliminated
    } as Match;

    const q2: Match = {
      id: "m_q2",
      matchNumber: 5,
      stage: "QUALIFIER_2",
      status: "COMPLETED",
      teamAId: "t2",
      teamBId: "t3",
      winningTeamId: "t2", // t2 wins to Final
    } as Match;

    const finalMatch: Match = {
      id: "m_final",
      matchNumber: 6,
      stage: "FINAL",
      status: "UPCOMING",
      teamAId: null,
      teamBId: null,
    } as Match;

    const allMatches = [...completedLeagueMatches, q1, elim, q2, finalMatch];
    const tournament = { id: "tourney_1", playoffFormat: "IPL_TOP4" } as Tournament;

    await syncKnockoutFixtures(allMatches, sortedStandings, tournament);

    // Final is Q1 Winner (t1) vs Q2 Winner (t2)
    expect(finalMatch.teamAId).toBe("t1");
    expect(finalMatch.teamBId).toBe("t2");
  });

  it("handles SEMI_FINALS with (1 vs 4) and (2 vs 3)", async () => {
    const sf1: Match = {
      id: "m_sf1",
      matchNumber: 3,
      stage: "SEMI_1",
      status: "COMPLETED",
      teamAId: "t1",
      teamBId: "t4",
      winningTeamId: "t1",
    } as Match;

    const sf2: Match = {
      id: "m_sf2",
      matchNumber: 4,
      stage: "SEMI_2",
      status: "COMPLETED",
      teamAId: "t2",
      teamBId: "t3",
      winningTeamId: "t3",
    } as Match;

    const finalMatch: Match = {
      id: "m_final",
      matchNumber: 5,
      stage: "FINAL",
      status: "UPCOMING",
      teamAId: null,
      teamBId: null,
    } as Match;

    const allMatches = [...completedLeagueMatches, sf1, sf2, finalMatch];
    const tournament = { id: "tourney_1", playoffFormat: "SEMI_FINALS" } as Tournament;

    await syncKnockoutFixtures(allMatches, sortedStandings, tournament);

    // Final is SF1 Winner (t1) vs SF2 Winner (t3)
    expect(finalMatch.teamAId).toBe("t1");
    expect(finalMatch.teamBId).toBe("t3");
  });

  it("keeps knockout fixtures as TBD while league matches are still in progress", async () => {
    const ongoingLeagueMatches: Match[] = [
      { id: "m1", matchNumber: 1, stage: "LEAGUE", status: "COMPLETED", teamAId: "t1", teamBId: "t2" } as Match,
      { id: "m2", matchNumber: 2, stage: "LEAGUE", status: "UPCOMING", teamAId: "t3", teamBId: "t4" } as Match,
    ];

    const finalMatch: Match = {
      id: "m_final",
      matchNumber: 3,
      stage: "FINAL",
      status: "UPCOMING",
      teamAId: "t1",
      teamBId: "t2",
    } as Match;

    const allMatches = [...ongoingLeagueMatches, finalMatch];
    const tournament = { id: "tourney_1", playoffFormat: "DIRECT_TOP2" } as Tournament;

    await syncKnockoutFixtures(allMatches, sortedStandings, tournament);

    // Does not qualify teams into final until all league matches are COMPLETED
    expect(finalMatch.status).toBe("UPCOMING");
  });
});
