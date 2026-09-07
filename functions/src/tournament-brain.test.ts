import { describe, it, expect } from "vitest";
import {
  computeNrr,
  effectiveNrrBalls,
  computeStandingsData,
  computeBracketPromotions,
} from "./tournament-brain";
import type { Tournament, Match, Innings, Team } from "./types";

describe("Central Backend Brain - Tournament Logic", () => {
  describe("ICC Net Run Rate Calculations", () => {
    it("uses full quota of balls when team is bowled out (all out)", () => {
      // 4 overs = 24 balls
      const quotaBalls = 24;
      const ballsFaced = 15;
      const isAllOut = true;

      const effective = effectiveNrrBalls(ballsFaced, isAllOut, quotaBalls);
      expect(effective).toBe(24);
    });

    it("uses actual balls faced when team is not all out (e.g. successful chase)", () => {
      const quotaBalls = 24;
      const ballsFaced = 18;
      const isAllOut = false;

      const effective = effectiveNrrBalls(ballsFaced, isAllOut, quotaBalls);
      expect(effective).toBe(18);
    });

    it("computes accurate NRR across runs and balls", () => {
      // Team scored 50 runs in 24 balls (RR = 12.5)
      // Team conceded 40 runs in 24 balls (RR = 10.0)
      // NRR = +2.5
      const nrr = computeNrr(50, 24, 40, 24);
      expect(nrr).toBeCloseTo(2.5, 3);
    });
  });

  describe("Standings Computation (Grouped & Single Table)", () => {
    const mockTeams: Team[] = [
      { id: "pak", name: "Pakistan", shortName: "PAK", groupName: "A", tournamentId: "t1" },
      { id: "ind", name: "India", shortName: "IND", groupName: "A", tournamentId: "t1" },
      { id: "sa", name: "South Africa", shortName: "SA", groupName: "B", tournamentId: "t1" },
      { id: "eng", name: "England", shortName: "ENG", groupName: "B", tournamentId: "t1" },
    ];

    it("partitions standings into Group A and Group B with group-scoped positions", () => {
      const tournament: Tournament = {
        id: "t1",
        name: "World Cup 2026",
        slug: "wc-2026",
        formatType: "TAPE_BALL_INDOOR",
        stageFormat: "GROUPS_AND_KNOCKOUT",
        groupPlayoffFormat: "GROUP_SEMI_FINALS",
        teamsPerGroupAdvance: 2,
        oversPerSide: 4,
        maxOverPerBowler: 1,
        playersPerTeam: 6,
        allowLastManStanding: true,
        wideRuns: 1,
        noBallRuns: 1,
        freeHitEnabled: true,
        playoffFormat: "SEMI_FINALS",
        status: "ONGOING",
        createdAt: null,
        updatedAt: null,
      };

      const matches: Match[] = [
        {
          id: "m1",
          tournamentId: "t1",
          matchNumber: 1,
          stage: "LEAGUE",
          groupName: "A",
          teamAId: "pak",
          teamBId: "ind",
          status: "COMPLETED",
          winningTeamId: "pak",
          oversPerSide: 4,
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "m2",
          tournamentId: "t1",
          matchNumber: 2,
          stage: "LEAGUE",
          groupName: "B",
          teamAId: "sa",
          teamBId: "eng",
          status: "COMPLETED",
          winningTeamId: "sa",
          oversPerSide: 4,
          createdAt: null,
          updatedAt: null,
        },
      ];

      const innings: Innings[] = [
        {
          id: "inn1",
          matchId: "m1",
          inningsNumber: 1,
          battingTeamId: "pak",
          bowlingTeamId: "ind",
          totalRuns: 45,
          totalWickets: 2,
          totalBalls: 24,
          isAllOut: false,
          isCompleted: true,
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "inn2",
          matchId: "m1",
          inningsNumber: 2,
          battingTeamId: "ind",
          bowlingTeamId: "pak",
          totalRuns: 30,
          totalWickets: 4,
          totalBalls: 24,
          isAllOut: false,
          isCompleted: true,
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "inn3",
          matchId: "m2",
          inningsNumber: 1,
          battingTeamId: "sa",
          bowlingTeamId: "eng",
          totalRuns: 50,
          totalWickets: 1,
          totalBalls: 24,
          isAllOut: false,
          isCompleted: true,
          createdAt: null,
          updatedAt: null,
        },
        {
          id: "inn4",
          matchId: "m2",
          inningsNumber: 2,
          battingTeamId: "eng",
          bowlingTeamId: "sa",
          totalRuns: 35,
          totalWickets: 3,
          totalBalls: 24,
          isAllOut: false,
          isCompleted: true,
          createdAt: null,
          updatedAt: null,
        },
      ];

      const standings = computeStandingsData({
        tournament,
        teams: mockTeams,
        matches,
        innings,
      });

      expect(standings.length).toBe(4);

      const groupA = standings.filter((s) => s.groupName === "A");
      const groupB = standings.filter((s) => s.groupName === "B");

      expect(groupA.length).toBe(2);
      expect(groupB.length).toBe(2);

      // In Group A: Pakistan is 1st (2 pts), India is 2nd (0 pts)
      expect(groupA[0].teamId).toBe("pak");
      expect(groupA[0].position).toBe(1);
      expect(groupA[0].points).toBe(2);
      expect(groupA[0].status).toBe("QUALIFIED_PLAYOFF");

      expect(groupA[1].teamId).toBe("ind");
      expect(groupA[1].position).toBe(2);
      expect(groupA[1].status).toBe("QUALIFIED_PLAYOFF");

      // In Group B: South Africa is 1st (2 pts), England is 2nd (0 pts)
      expect(groupB[0].teamId).toBe("sa");
      expect(groupB[0].position).toBe(1);
      expect(groupB[0].status).toBe("QUALIFIED_PLAYOFF");

      expect(groupB[1].teamId).toBe("eng");
      expect(groupB[1].position).toBe(2);
      expect(groupB[1].status).toBe("QUALIFIED_PLAYOFF");
    });
  });

  describe("Bracket Promotion Engine", () => {
    it("advances A1 vs B2 and B1 vs A2 when group matches complete, and feeds SF winners to Final", () => {
      const tournament: Tournament = {
        id: "t_wc",
        name: "World Cup",
        slug: "wc",
        formatType: "TAPE_BALL_INDOOR",
        stageFormat: "GROUPS_AND_KNOCKOUT",
        groupPlayoffFormat: "GROUP_SEMI_FINALS",
        teamsPerGroupAdvance: 2,
        oversPerSide: 4,
        maxOverPerBowler: 1,
        playersPerTeam: 6,
        allowLastManStanding: true,
        wideRuns: 1,
        noBallRuns: 1,
        freeHitEnabled: true,
        playoffFormat: "SEMI_FINALS",
        status: "ONGOING",
        createdAt: null,
        updatedAt: null,
      };

      const groupStandings = [
        { teamId: "pak", groupName: "A", position: 1, played: 1, won: 1, lost: 0, tied: 0, noResult: 0, points: 2, runsFor: 45, ballsFor: 24, runsAgainst: 30, ballsAgainst: 24, netRunRate: 3.75, status: "QUALIFIED_PLAYOFF" as const },
        { teamId: "ind", groupName: "A", position: 2, played: 1, won: 0, lost: 1, tied: 0, noResult: 0, points: 0, runsFor: 30, ballsFor: 24, runsAgainst: 45, ballsAgainst: 24, netRunRate: -3.75, status: "QUALIFIED_PLAYOFF" as const },
        { teamId: "sa", groupName: "B", position: 1, played: 1, won: 1, lost: 0, tied: 0, noResult: 0, points: 2, runsFor: 50, ballsFor: 24, runsAgainst: 35, ballsAgainst: 24, netRunRate: 3.75, status: "QUALIFIED_PLAYOFF" as const },
        { teamId: "eng", groupName: "B", position: 2, played: 1, won: 0, lost: 1, tied: 0, noResult: 0, points: 0, runsFor: 35, ballsFor: 24, runsAgainst: 50, ballsAgainst: 24, netRunRate: -3.75, status: "QUALIFIED_PLAYOFF" as const },
      ];

      const completedLeagueMatches: Match[] = [
        { id: "m1", tournamentId: "t_wc", matchNumber: 1, stage: "LEAGUE", groupName: "A", status: "COMPLETED", teamAId: "pak", teamBId: "ind", oversPerSide: 4, createdAt: null, updatedAt: null },
        { id: "m2", tournamentId: "t_wc", matchNumber: 2, stage: "LEAGUE", groupName: "B", status: "COMPLETED", teamAId: "sa", teamBId: "eng", oversPerSide: 4, createdAt: null, updatedAt: null },
      ];

      const semi1: Match = { id: "m_sf1", tournamentId: "t_wc", matchNumber: 3, stage: "SEMI_1", status: "UPCOMING", teamAId: null, teamBId: null, oversPerSide: 4, createdAt: null, updatedAt: null };
      const semi2: Match = { id: "m_sf2", tournamentId: "t_wc", matchNumber: 4, stage: "SEMI_2", status: "UPCOMING", teamAId: null, teamBId: null, oversPerSide: 4, createdAt: null, updatedAt: null };
      const finalMatch: Match = { id: "m_fn", tournamentId: "t_wc", matchNumber: 5, stage: "FINAL", status: "UPCOMING", teamAId: null, teamBId: null, oversPerSide: 4, createdAt: null, updatedAt: null };

      // Phase 1: League completed -> SFs should be populated
      const sfUpdates = computeBracketPromotions({
        tournament,
        matches: [...completedLeagueMatches, semi1, semi2, finalMatch],
        standings: groupStandings,
      });

      expect(sfUpdates).toContainEqual({ matchId: "m_sf1", teamAId: "pak", teamBId: "eng" }); // A1 vs B2
      expect(sfUpdates).toContainEqual({ matchId: "m_sf2", teamAId: "sa", teamBId: "ind" });  // B1 vs A2

      // Phase 2: Semi-Finals completed -> Final should be populated with winners
      semi1.status = "COMPLETED";
      semi1.teamAId = "pak";
      semi1.teamBId = "eng";
      semi1.winningTeamId = "pak";

      semi2.status = "COMPLETED";
      semi2.teamAId = "sa";
      semi2.teamBId = "ind";
      semi2.winningTeamId = "sa";

      const finalUpdates = computeBracketPromotions({
        tournament,
        matches: [...completedLeagueMatches, semi1, semi2, finalMatch],
        standings: groupStandings,
      });

      expect(finalUpdates).toContainEqual({ matchId: "m_fn", teamAId: "pak", teamBId: "sa" });
    });
  });
});
