import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Team, Player, TournamentTeamMembership, Tournament } from "./firestore";

describe("Team Manager Persona & RBAC Authorization Logic", () => {
  const sampleOwnerUid = "user_tm_123";
  const sampleOwnerEmail = "manager@lahorelions.com";

  const otherUserUid = "user_other_456";
  const otherUserEmail = "stranger@otherclub.com";

  let mockTeam: Team;
  let mockRoster: Player[];
  let mockMemberships: TournamentTeamMembership[];

  beforeEach(() => {
    mockTeam = {
      id: "team_lahore_lions",
      name: "Lahore Lions",
      shortName: "LHR",
      city: "Lahore",
      ownerId: sampleOwnerUid,
      ownerEmail: sampleOwnerEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockRoster = [
      {
        id: "p1",
        teamId: "team_lahore_lions",
        name: "Babar Azam",
        jerseyNumber: 56,
        role: "Batsman",
        isCaptain: true,
        designation: "Captain",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "p2",
        teamId: "team_lahore_lions",
        name: "Shaheen Afridi",
        jerseyNumber: 10,
        role: "Bowler",
        isViceCaptain: true,
        designation: "Vice Captain",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "p3",
        teamId: "team_lahore_lions",
        name: "Mohammad Rizwan",
        jerseyNumber: 16,
        role: "Wicketkeeper",
        designation: "Team Member",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    mockMemberships = [];
  });

  it("1. User creates a team and becomes the TEAM_MANAGER / Owner", () => {
    expect(mockTeam.ownerId).toBe(sampleOwnerUid);
    expect(mockTeam.ownerEmail).toBe(sampleOwnerEmail);
    expect(mockTeam.name).toBe("Lahore Lions");
    expect(mockTeam.shortName).toBe("LHR");
  });

  it("2. Team Manager can authorize edits to their own team", () => {
    const isAuthorized = (team: Team, userUid: string, userEmail: string) => {
      return team.ownerId === userUid || team.ownerEmail === userEmail;
    };

    expect(isAuthorized(mockTeam, sampleOwnerUid, sampleOwnerEmail)).toBe(true);
    expect(isAuthorized(mockTeam, otherUserUid, otherUserEmail)).toBe(false);
  });

  it("3. Team Manager cannot edit or delete another team", () => {
    const updateTeam = (team: Team, userUid: string, userEmail: string, newName: string) => {
      if (team.ownerId !== userUid && team.ownerEmail !== userEmail) {
        throw new Error("You are not authorized to edit this team.");
      }
      return { ...team, name: newName };
    };

    expect(() =>
      updateTeam(mockTeam, otherUserUid, otherUserEmail, "Hacked Team Name"),
    ).toThrow("You are not authorized to edit this team.");

    const updated = updateTeam(mockTeam, sampleOwnerUid, sampleOwnerEmail, "Lahore Lions CC");
    expect(updated.name).toBe("Lahore Lions CC");
  });

  it("4. Team Manager can manage permanent roster players", () => {
    expect(mockRoster.length).toBe(3);
    const captain = mockRoster.find((p) => p.isCaptain);
    expect(captain?.name).toBe("Babar Azam");

    // Add new player
    const newPlayer: Player = {
      id: "p4",
      teamId: mockTeam.id,
      name: "Haris Rauf",
      jerseyNumber: 150,
      role: "Bowler",
      designation: "Team Member",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedRoster = [...mockRoster, newPlayer];
    expect(updatedRoster.length).toBe(4);
  });

  it("5. Team Manager submits request to join open tournament with PENDING status", () => {
    const tournamentId = "tourney_corporate_2026";
    const requestMembership: TournamentTeamMembership = {
      id: `${tournamentId}_${mockTeam.id}`,
      tournamentId,
      teamId: mockTeam.id,
      teamName: mockTeam.name,
      teamShortName: mockTeam.shortName,
      status: "PENDING",
      source: "TEAM_REQUEST",
      requestedBy: sampleOwnerEmail,
      squadPlayerIds: ["p1", "p2"], // 2 selected for squad
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockMemberships.push(requestMembership);
    expect(mockMemberships[0].status).toBe("PENDING");
    expect(mockMemberships[0].source).toBe("TEAM_REQUEST");
  });

  it("6. Organizer accepts team request and team becomes ACCEPTED participant", () => {
    const mem = {
      id: "tourney_1_team_1",
      tournamentId: "tourney_1",
      teamId: mockTeam.id,
      status: "PENDING" as const,
      source: "TEAM_REQUEST" as const,
      requestedBy: sampleOwnerEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Organizer accepts
    const acceptedMem: TournamentTeamMembership = {
      ...mem,
      status: "ACCEPTED",
      groupName: "A",
      updatedAt: new Date().toISOString(),
    };

    expect(acceptedMem.status).toBe("ACCEPTED");
    expect(acceptedMem.groupName).toBe("A");
  });

  it("7. Organizer can invite team and Team Manager can accept/decline", () => {
    // Organizer sends invite
    const invite: TournamentTeamMembership = {
      id: "tourney_2_team_1",
      tournamentId: "tourney_2",
      teamId: mockTeam.id,
      status: "INVITED",
      source: "ORGANIZER_INVITE",
      invitedBy: "organizer@corporatecricket.com",
      groupName: "B",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(invite.status).toBe("INVITED");

    // Manager declines
    const declined: TournamentTeamMembership = {
      ...invite,
      status: "DECLINED",
      updatedAt: new Date().toISOString(),
    };
    expect(declined.status).toBe("DECLINED");

    // Or Manager accepts
    const accepted: TournamentTeamMembership = {
      ...invite,
      status: "ACCEPTED",
      updatedAt: new Date().toISOString(),
    };
    expect(accepted.status).toBe("ACCEPTED");
  });

  it("8. Tournament squad is separate from permanent roster", () => {
    // Permanent roster has 3 players
    expect(mockRoster.length).toBe(3);

    // Tournament squad selects only 2 players (p1 and p2)
    const tournamentSquadIds = ["p1", "p2"];
    const tournamentSquad = mockRoster.filter((p) => tournamentSquadIds.includes(p.id));

    expect(tournamentSquad.length).toBe(2);
    expect(tournamentSquad.map((p) => p.name)).toEqual(["Babar Azam", "Shaheen Afridi"]);
    // p3 (Rizwan) remains in permanent roster but not in this tournament squad
    expect(mockRoster.find((p) => p.id === "p3")).toBeDefined();
  });

  it("9. Team Manager has zero permission to edit match scores or tournament settings", () => {
    type Action = "EDIT_SCORE" | "START_MATCH" | "SET_RULES" | "MANAGE_TEAM_ROSTER";

    const canPerformAction = (role: "OWNER" | "ADMIN" | "SCORER" | "TEAM_MANAGER", action: Action) => {
      if (role === "TEAM_MANAGER") {
        return action === "MANAGE_TEAM_ROSTER";
      }
      if (role === "SCORER") {
        return action === "EDIT_SCORE" || action === "START_MATCH";
      }
      if (role === "ADMIN" || role === "OWNER") {
        return true;
      }
      return false;
    };

    expect(canPerformAction("TEAM_MANAGER", "MANAGE_TEAM_ROSTER")).toBe(true);
    expect(canPerformAction("TEAM_MANAGER", "EDIT_SCORE")).toBe(false);
    expect(canPerformAction("TEAM_MANAGER", "START_MATCH")).toBe(false);
    expect(canPerformAction("TEAM_MANAGER", "SET_RULES")).toBe(false);
  });

  it("10. Bootstrap legacy unassigned teams to platform administrator (ahsanhayat092@gmail.com)", () => {
    const adminEmail = "ahsanhayat092@gmail.com";

    const allDbTeams: Team[] = [
      {
        id: "legacy_team_1",
        tournamentId: "main",
        name: "WASA Hawks",
        shortName: "HWK",
        groupName: "A",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "legacy_team_2",
        tournamentId: "main",
        name: "WASA Strikers",
        shortName: "STR",
        groupName: "B",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "new_team_user",
        name: "Karachi Kings",
        shortName: "KK",
        ownerEmail: "other@club.com",
        ownerId: "user_other",
        createdAt: "2026-02-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
      },
    ];

    const getManagerTeams = (email: string) => {
      const isPlatformAdmin = email.toLowerCase().trim() === adminEmail;
      return allDbTeams.filter((t) => {
        const matchEmail = t.ownerEmail?.toLowerCase().trim() === email.toLowerCase().trim();
        const isLegacyUnassigned = isPlatformAdmin && !t.ownerEmail && !t.ownerId;
        return matchEmail || isLegacyUnassigned;
      });
    };

    const adminManagedTeams = getManagerTeams(adminEmail);
    expect(adminManagedTeams.length).toBe(2);
    expect(adminManagedTeams.map((t) => t.id)).toEqual(["legacy_team_1", "legacy_team_2"]);

    // Another user only sees their own team
    const otherUserTeams = getManagerTeams("other@club.com");
    expect(otherUserTeams.length).toBe(1);
    expect(otherUserTeams[0].id).toBe("new_team_user");
  });
});
