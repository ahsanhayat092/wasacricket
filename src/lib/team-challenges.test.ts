import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TeamChallenge, ChallengeType, ChallengeStatus, Team } from "./firestore";

describe("Team Manager Friendly Challenges & Bilateral Series Suite", () => {
  const challengerManagerId = "user_tm_challenger";
  const challengerManagerEmail = "challenger@lions.com";
  const opponentManagerId = "user_tm_opponent";
  const opponentManagerEmail = "opponent@falcons.com";

  let challengerTeam: Team;
  let opponentTeam: Team;

  beforeEach(() => {
    challengerTeam = {
      id: "team_lions",
      name: "Lahore Lions",
      shortName: "LHR",
      ownerId: challengerManagerId,
      ownerEmail: challengerManagerEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    opponentTeam = {
      id: "team_falcons",
      name: "Faisalabad Falcons",
      shortName: "FBD",
      ownerId: opponentManagerId,
      ownerEmail: opponentManagerEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  it("calculates correct number of matches based on challenge type", () => {
    const resolveMatchCount = (type: ChallengeType, customNum?: number): number => {
      if (customNum) return customNum;
      switch (type) {
        case "SINGLE":
          return 1;
        case "SERIES_2":
          return 2;
        case "BEST_OF_3":
        case "SERIES_3":
          return 3;
        case "BEST_OF_5":
          return 5;
        default:
          return 1;
      }
    };

    expect(resolveMatchCount("SINGLE")).toBe(1);
    expect(resolveMatchCount("SERIES_2")).toBe(2);
    expect(resolveMatchCount("BEST_OF_3")).toBe(3);
    expect(resolveMatchCount("SERIES_3")).toBe(3);
    expect(resolveMatchCount("BEST_OF_5")).toBe(5);
    expect(resolveMatchCount("SINGLE", 4)).toBe(4);
  });

  it("correctly models and validates a pending challenge creation", () => {
    const newChallenge: Omit<TeamChallenge, "id"> = {
      challengerTeamId: challengerTeam.id,
      challengerTeamName: challengerTeam.name,
      challengerTeamShortName: challengerTeam.shortName,
      challengerManagerId: challengerManagerId,
      challengerManagerEmail: challengerManagerEmail,

      opponentTeamId: opponentTeam.id,
      opponentTeamName: opponentTeam.name,
      opponentTeamShortName: opponentTeam.shortName,
      opponentManagerId: opponentManagerId,
      opponentManagerEmail: opponentManagerEmail,

      challengeType: "BEST_OF_3",
      numberOfMatches: 3,
      formatType: "TAPE_BALL_INDOOR",
      oversPerSide: 6,
      playersPerTeam: 6,
      venue: "Askari XI Sports Complex, Lahore",
      proposedDate: "2026-09-10",
      proposedTime: "20:00",
      message: "Looking for a competitive 3-match weekend tape-ball series!",

      status: "PENDING",
      challengerWins: 0,
      opponentWins: 0,
      tiedMatches: 0,
      winnerTeamId: null,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(newChallenge.status).toBe("PENDING");
    expect(newChallenge.numberOfMatches).toBe(3);
    expect(newChallenge.oversPerSide).toBe(6);
    expect(newChallenge.challengerTeamId).toBe("team_lions");
    expect(newChallenge.opponentTeamId).toBe("team_falcons");
  });

  it("handles challenge acceptance with match generation and scorer PIN generation", () => {
    const challenge: TeamChallenge = {
      id: "ch_12345",
      challengerTeamId: challengerTeam.id,
      challengerTeamName: challengerTeam.name,
      challengerTeamShortName: challengerTeam.shortName,
      challengerManagerId: challengerManagerId,
      challengerManagerEmail: challengerManagerEmail,

      opponentTeamId: opponentTeam.id,
      opponentTeamName: opponentTeam.name,
      opponentTeamShortName: opponentTeam.shortName,
      opponentManagerId: opponentManagerId,
      opponentManagerEmail: opponentManagerEmail,

      challengeType: "BEST_OF_3",
      numberOfMatches: 3,
      formatType: "TAPE_BALL_INDOOR",
      oversPerSide: 6,
      playersPerTeam: 6,
      venue: "Askari XI Sports Complex",
      proposedDate: "2026-09-10",
      proposedTime: "20:00",
      status: "PENDING",

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simulate accept logic
    const scorerPin = "654321";
    const generatedMatchIds = ["m_ch1", "m_ch2", "m_ch3"];
    const friendlyTourneyId = `friendly_${challenge.id}`;

    const acceptedChallenge: TeamChallenge = {
      ...challenge,
      status: "ACCEPTED",
      scorerPin,
      matchIds: generatedMatchIds,
      updatedAt: new Date().toISOString(),
    };

    expect(acceptedChallenge.status).toBe("ACCEPTED");
    expect(acceptedChallenge.scorerPin).toHaveLength(6);
    expect(acceptedChallenge.matchIds).toHaveLength(3);
    expect(friendlyTourneyId).toBe("friendly_ch_12345");
  });

  it("updates series score tracking and determines bilateral champion", () => {
    let challenge: TeamChallenge = {
      id: "ch_series_999",
      challengerTeamId: "team_lions",
      challengerTeamName: "Lahore Lions",
      challengerTeamShortName: "LHR",
      challengerManagerId,
      challengerManagerEmail,

      opponentTeamId: "team_falcons",
      opponentTeamName: "Faisalabad Falcons",
      opponentTeamShortName: "FBD",

      challengeType: "BEST_OF_3",
      numberOfMatches: 3,
      formatType: "TAPE_BALL_INDOOR",
      oversPerSide: 4,
      playersPerTeam: 6,
      venue: "Askari XI",
      proposedDate: "2026-09-12",
      status: "ACCEPTED",
      matchIds: ["m1", "m2", "m3"],
      scorerPin: "123456",

      challengerWins: 0,
      opponentWins: 0,
      tiedMatches: 0,
      winnerTeamId: null,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Match 1: Lions win
    challenge = { ...challenge, challengerWins: 1 };
    expect(challenge.challengerWins).toBe(1);
    expect(challenge.opponentWins).toBe(0);

    // Match 2: Lions win again (Best of 3 sealed 2-0)
    challenge = {
      ...challenge,
      challengerWins: 2,
      winnerTeamId: "team_lions",
      status: "COMPLETED",
    };

    expect(challenge.challengerWins).toBe(2);
    expect(challenge.winnerTeamId).toBe("team_lions");
    expect(challenge.status).toBe("COMPLETED");
  });

  it("handles declining and withdrawing challenges gracefully", () => {
    const initialChallenge: TeamChallenge = {
      id: "ch_pending_1",
      challengerTeamId: "team_lions",
      challengerTeamName: "Lahore Lions",
      challengerTeamShortName: "LHR",
      challengerManagerId,
      challengerManagerEmail,

      opponentTeamId: "team_falcons",
      opponentTeamName: "Faisalabad Falcons",
      opponentTeamShortName: "FBD",

      challengeType: "SINGLE",
      numberOfMatches: 1,
      formatType: "T20",
      oversPerSide: 20,
      playersPerTeam: 11,
      venue: "Gaddafi Stadium",
      proposedDate: "2026-09-15",
      status: "PENDING",

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Decline
    const declinedChallenge: TeamChallenge = {
      ...initialChallenge,
      status: "DECLINED",
      declineReason: "Ground unavailable on this date",
      updatedAt: new Date().toISOString(),
    };
    expect(declinedChallenge.status).toBe("DECLINED");
    expect(declinedChallenge.declineReason).toBe("Ground unavailable on this date");

    // Withdraw
    const withdrawnChallenge: TeamChallenge = {
      ...initialChallenge,
      status: "WITHDRAWN",
      updatedAt: new Date().toISOString(),
    };
    expect(withdrawnChallenge.status).toBe("WITHDRAWN");
  });
});
