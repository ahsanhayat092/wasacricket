import { describe, it, expect, beforeEach } from "vitest";

/**
 * Mock Firestore Security Rules Evaluator.
 * Implements the exact logic of firestore.rules to verify all authorization matrices,
 * role boundaries, and privilege escalation guards across all personas.
 */

type AuthContext = {
  uid: string | null;
  token?: { email?: string };
} | null;

interface DocumentState {
  path: string;
  data: Record<string, any>;
}

class SecurityRulesEvaluator {
  private db: Map<string, Record<string, any>> = new Map();

  public seed(path: string, data: Record<string, any>) {
    this.db.set(path, { ...data });
  }

  public getDoc(path: string): Record<string, any> | null {
    return this.db.get(path) || null;
  }

  private isSuperAdmin(auth: AuthContext): boolean {
    if (!auth || !auth.uid) return false;
    if (auth.token?.email === "ahsanhayat092@gmail.com" || auth.uid === "org_ahsanhayat092_gmail_com") return true;
    return this.db.has(`system_admins/${auth.uid}`);
  }

  private isTournamentOwner(tourneyId: string, auth: AuthContext): boolean {
    if (!auth || !auth.uid) return false;
    if (this.isSuperAdmin(auth)) return true;
    const tourney = this.getDoc(`tournaments/${tourneyId}`);
    if (tourney) {
      if (tourney.ownerId === auth.uid) return true;
      if (!("ownerId" in tourney) && tourney.ownerEmail === auth.token?.email) return true;
    }
    const member = this.getDoc(`tournamentMembers/${tourneyId}_${auth.uid}`);
    if (member && member.role === "OWNER") return true;
    return false;
  }

  private isTournamentAdmin(tourneyId: string, auth: AuthContext): boolean {
    if (!auth || !auth.uid) return false;
    if (this.isSuperAdmin(auth) || this.isTournamentOwner(tourneyId, auth)) return true;
    const member = this.getDoc(`tournamentMembers/${tourneyId}_${auth.uid}`);
    return member?.role === "ADMIN" || member?.role === "OWNER";
  }

  private isTournamentScorer(tourneyId: string, auth: AuthContext): boolean {
    if (!auth || !auth.uid) return false;
    if (this.isSuperAdmin(auth) || this.isTournamentAdmin(tourneyId, auth)) return true;
    const member = this.getDoc(`tournamentMembers/${tourneyId}_${auth.uid}`);
    return member?.role === "SCORER";
  }

  private isTeamManager(teamId: string, auth: AuthContext): boolean {
    if (!auth || !auth.uid) return false;
    if (this.isSuperAdmin(auth)) return true;
    const team = this.getDoc(`teams/${teamId}`);
    if (team) {
      if (team.ownerId === auth.uid) return true;
      if (!("ownerId" in team) && team.ownerEmail === auth.token?.email) return true;
    }
    return false;
  }

  // Evaluate Read
  public canRead(path: string, auth: AuthContext): boolean {
    const segments = path.split("/");
    const collection = segments[0];

    // Public collections
    if (
      [
        "tournaments",
        "teams",
        "players",
        "matches",
        "innings",
        "battingScores",
        "bowlingScores",
        "standings",
        "tournamentTeamMemberships",
      ].includes(collection)
    ) {
      return true;
    }

    // Private collections
    if (collection === "users") {
      const targetUid = segments[1];
      return !!auth?.uid && (auth.uid === targetUid || this.isSuperAdmin(auth));
    }

    if (collection === "tournamentMembers") {
      const doc = this.getDoc(path);
      if (!auth?.uid || !doc) return false;
      return this.isSuperAdmin(auth) || this.isTournamentOwner(doc.tournamentId, auth) || this.isTournamentAdmin(doc.tournamentId, auth);
    }

    if (collection === "system_admins") {
      return this.isSuperAdmin(auth);
    }

    return false;
  }

  // Evaluate Create
  public canCreate(path: string, data: Record<string, any>, auth: AuthContext): boolean {
    if (!auth || !auth.uid) return false;
    const segments = path.split("/");
    const collection = segments[0];

    if (this.isSuperAdmin(auth)) return true;

    if (collection === "tournaments") {
      return data.ownerId === auth.uid && typeof data.name === "string" && data.name.length > 0;
    }

    if (collection === "teams") {
      return Boolean(
        typeof data.name === "string" &&
        data.name.length > 0 &&
        (data.ownerId === auth.uid || (data.tournamentId && this.isTournamentAdmin(data.tournamentId, auth)))
      );
    }

    if (collection === "players") {
      return Boolean(
        typeof data.name === "string" &&
        data.name.length > 0 &&
        ((data.teamId && this.isTeamManager(data.teamId, auth)) ||
          (data.tournamentId && this.isTournamentAdmin(data.tournamentId, auth)))
      );
    }

    if (collection === "matches") {
      return Boolean(!data.tournamentId || this.isTournamentAdmin(data.tournamentId, auth));
    }

    if (collection === "innings" || collection === "battingScores" || collection === "bowlingScores") {
      return Boolean(!data.tournamentId || this.isTournamentScorer(data.tournamentId, auth));
    }

    if (collection === "tournamentMembers") {
      return Boolean(
        data.tournamentId &&
        this.isTournamentOwner(data.tournamentId, auth) &&
        data.role !== "OWNER"
      );
    }

    if (collection === "tournamentTeamMemberships") {
      if (data.tournamentId && this.isTournamentAdmin(data.tournamentId, auth)) return true;
      if (data.teamId && this.isTeamManager(data.teamId, auth) && data.status === "PENDING" && data.requestedBy === auth.uid) return true;
      return false;
    }

    return false;
  }

  // Evaluate Update
  public canUpdate(path: string, newData: Record<string, any>, auth: AuthContext): boolean {
    if (!auth || !auth.uid) return false;
    const segments = path.split("/");
    const collection = segments[0];
    const existing = this.getDoc(path);
    if (!existing) return false;

    if (this.isSuperAdmin(auth)) return true;

    if (collection === "tournaments") {
      const isOwner = this.isTournamentOwner(segments[1], auth);
      const ownerUnchanged = !newData.ownerId || newData.ownerId === existing.ownerId;
      return Boolean(isOwner && ownerUnchanged);
    }

    if (collection === "teams") {
      const isMgr = this.isTeamManager(segments[1], auth);
      const isTourneyAdmin = existing.tournamentId && this.isTournamentAdmin(existing.tournamentId, auth);
      const ownerUnchanged = !newData.ownerId || !existing.ownerId || newData.ownerId === existing.ownerId;
      return Boolean((isMgr || isTourneyAdmin) && ownerUnchanged);
    }

    if (collection === "players") {
      const isMgr = existing.teamId && this.isTeamManager(existing.teamId, auth);
      const isTourneyAdmin = existing.tournamentId && this.isTournamentAdmin(existing.tournamentId, auth);
      return Boolean(isMgr || isTourneyAdmin);
    }

    if (collection === "matches") {
      return Boolean(!existing.tournamentId || this.isTournamentScorer(existing.tournamentId, auth));
    }

    if (collection === "innings" || collection === "battingScores" || collection === "bowlingScores") {
      return Boolean(!existing.tournamentId || this.isTournamentScorer(existing.tournamentId, auth));
    }

    if (collection === "tournamentMembers") {
      const isOwner = existing.tournamentId && this.isTournamentOwner(existing.tournamentId, auth);
      const notPromotingToOwner = newData.role !== "OWNER" || existing.role === "OWNER";
      return Boolean(isOwner && notPromotingToOwner);
    }

    if (collection === "tournamentTeamMemberships") {
      const isTourneyAdmin = existing.tournamentId && this.isTournamentAdmin(existing.tournamentId, auth);
      const isMgr = existing.teamId && this.isTeamManager(existing.teamId, auth);
      return Boolean(isTourneyAdmin || isMgr);
    }

    return false;
  }
}

describe("Firestore Security Rules Matrix & Privilege Hardening", () => {
  let evalRules: SecurityRulesEvaluator;

  const anonymous = null;
  const teamManagerA = { uid: "user_manager_a", token: { email: "manager_a@cricket.com" } };
  const teamManagerB = { uid: "user_manager_b", token: { email: "manager_b@cricket.com" } };
  const tourneyOwner = { uid: "user_owner_wpl", token: { email: "owner_wpl@cricket.com" } };
  const tourneyAdmin = { uid: "user_admin_wpl", token: { email: "admin_wpl@cricket.com" } };
  const tourneyScorer = { uid: "user_scorer_wpl", token: { email: "scorer_wpl@cricket.com" } };
  const randomUser = { uid: "user_random_attacker", token: { email: "attacker@hack.com" } };
  const superAdmin = { uid: "org_ahsanhayat092_gmail_com", token: { email: "ahsanhayat092@gmail.com" } };

  beforeEach(() => {
    evalRules = new SecurityRulesEvaluator();

    // Seed test world
    evalRules.seed("tournaments/wpl_2026", {
      id: "wpl_2026",
      name: "WASA Premier League 2026",
      ownerId: "user_owner_wpl",
    });

    evalRules.seed("tournamentMembers/wpl_2026_user_admin_wpl", {
      tournamentId: "wpl_2026",
      userId: "user_admin_wpl",
      role: "ADMIN",
    });

    evalRules.seed("tournamentMembers/wpl_2026_user_scorer_wpl", {
      tournamentId: "wpl_2026",
      userId: "user_scorer_wpl",
      role: "SCORER",
    });

    evalRules.seed("teams/team_lions", {
      id: "team_lions",
      name: "Lahore Lions",
      ownerId: "user_manager_a",
      tournamentId: "wpl_2026",
    });

    evalRules.seed("teams/team_falcons", {
      id: "team_falcons",
      name: "Faisalabad Falcons",
      ownerId: "user_manager_b",
      tournamentId: "wpl_2026",
    });

    evalRules.seed("players/player_babar", {
      id: "player_babar",
      name: "Babar Azam",
      teamId: "team_lions",
      tournamentId: "wpl_2026",
    });

    evalRules.seed("matches/match_101", {
      id: "match_101",
      tournamentId: "wpl_2026",
      status: "UPCOMING",
    });

    evalRules.seed("innings/inn_101_1", {
      id: "inn_101_1",
      tournamentId: "wpl_2026",
      matchId: "match_101",
    });
  });

  describe("1. Public / Anonymous Access", () => {
    it("ALLOWS public reads on tournaments, teams, players, matches, scorecards", () => {
      expect(evalRules.canRead("tournaments/wpl_2026", anonymous)).toBe(true);
      expect(evalRules.canRead("teams/team_lions", anonymous)).toBe(true);
      expect(evalRules.canRead("players/player_babar", anonymous)).toBe(true);
      expect(evalRules.canRead("matches/match_101", anonymous)).toBe(true);
    });

    it("DENIES anonymous writes across all collections", () => {
      expect(evalRules.canCreate("tournaments/t_new", { name: "Hack" }, anonymous)).toBe(false);
      expect(evalRules.canCreate("teams/team_new", { name: "Hack" }, anonymous)).toBe(false);
      expect(evalRules.canCreate("players/p_new", { name: "Hack" }, anonymous)).toBe(false);
      expect(evalRules.canUpdate("matches/match_101", { status: "COMPLETED" }, anonymous)).toBe(false);
    });
  });

  describe("2. Team Manager Persona", () => {
    it("ALLOWS Team Manager to create own team & manage own players", () => {
      expect(evalRules.canCreate("teams/team_new", { name: "New Club", ownerId: "user_manager_a" }, teamManagerA)).toBe(true);
      expect(evalRules.canUpdate("teams/team_lions", { name: "Lahore Lions Updated", ownerId: "user_manager_a" }, teamManagerA)).toBe(true);
      expect(evalRules.canCreate("players/p_new", { name: "Rizwan", teamId: "team_lions" }, teamManagerA)).toBe(true);
      expect(evalRules.canUpdate("players/player_babar", { name: "Babar Azam (C)" }, teamManagerA)).toBe(true);
    });

    it("DENIES Team Manager from modifying another team or another team's players", () => {
      expect(evalRules.canUpdate("teams/team_falcons", { name: "Hijacked Team" }, teamManagerA)).toBe(false);
      expect(evalRules.canCreate("players/p_fake", { name: "Fake Player", teamId: "team_falcons" }, teamManagerA)).toBe(false);
    });

    it("ALLOWS Team Manager to request tournament participation with PENDING status", () => {
      expect(
        evalRules.canCreate(
          "tournamentTeamMemberships/mem_1",
          { tournamentId: "wpl_2026", teamId: "team_lions", status: "PENDING", requestedBy: "user_manager_a" },
          teamManagerA
        )
      ).toBe(true);
    });

    it("DENIES Team Manager from creating an ACCEPTED membership for someone else's team", () => {
      expect(
        evalRules.canCreate(
          "tournamentTeamMemberships/mem_2",
          { tournamentId: "wpl_2026", teamId: "team_falcons", status: "ACCEPTED", requestedBy: "user_manager_a" },
          teamManagerA
        )
      ).toBe(false);
    });
  });

  describe("3. Tournament Owner Persona", () => {
    it("ALLOWS Owner full management of their tournament", () => {
      expect(evalRules.canUpdate("tournaments/wpl_2026", { name: "WASA Premier League 2026 - Season 3", ownerId: "user_owner_wpl" }, tourneyOwner)).toBe(true);
      expect(evalRules.canCreate("tournamentMembers/wpl_2026_user_scorer2", { tournamentId: "wpl_2026", userId: "user_scorer2", role: "SCORER" }, tourneyOwner)).toBe(true);
      expect(evalRules.canUpdate("matches/match_101", { status: "LIVE" }, tourneyOwner)).toBe(true);
    });

    it("DENIES Owner from managing unrelated tournaments", () => {
      evalRules.seed("tournaments/lahore_cup", { id: "lahore_cup", name: "Lahore Cup", ownerId: "other_owner" });
      expect(evalRules.canUpdate("tournaments/lahore_cup", { name: "Hijacked" }, tourneyOwner)).toBe(false);
    });
  });

  describe("4. Tournament Scorer Persona", () => {
    it("ALLOWS assigned Scorer to update match and scorecards", () => {
      expect(evalRules.canUpdate("matches/match_101", { status: "LIVE" }, tourneyScorer)).toBe(true);
      expect(evalRules.canUpdate("innings/inn_101_1", { runs: 25, wickets: 1 }, tourneyScorer)).toBe(true);
    });

    it("DENIES Scorer from modifying tournament settings, members, or ownership", () => {
      expect(evalRules.canUpdate("tournaments/wpl_2026", { name: "Scorer Changed Tournament" }, tourneyScorer)).toBe(false);
      expect(evalRules.canCreate("tournamentMembers/wpl_2026_new", { tournamentId: "wpl_2026", role: "ADMIN" }, tourneyScorer)).toBe(false);
    });
  });

  describe("5. Privilege Escalation Guards", () => {
    it("DENIES Admin from promoting themselves or anyone to OWNER", () => {
      expect(
        evalRules.canCreate(
          "tournamentMembers/wpl_2026_hacked",
          { tournamentId: "wpl_2026", userId: "user_admin_wpl", role: "OWNER" },
          tourneyAdmin
        )
      ).toBe(false);
    });

    it("DENIES malicious user from changing ownerId on an existing tournament", () => {
      expect(
        evalRules.canUpdate(
          "tournaments/wpl_2026",
          { name: "WPL", ownerId: "user_random_attacker" },
          tourneyOwner
        )
      ).toBe(false);
    });

    it("ALLOWS Super Admin full bypass across all operations", () => {
      expect(evalRules.canUpdate("tournaments/wpl_2026", { name: "SuperAdmin Edit", ownerId: "new_owner" }, superAdmin)).toBe(true);
      expect(evalRules.canRead("users/private_user_1", superAdmin)).toBe(true);
    });
  });
});
