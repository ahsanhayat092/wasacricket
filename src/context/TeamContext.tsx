import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getUserManagedTeams, getPlayersByTeam, getTeamMembershipsWithDetails, type TeamMembershipWithTournament } from "@/lib/queries";
import { bootstrapLegacyTeamsAdmin } from "@/lib/mutations";
import { type Team, type Player } from "@/lib/firestore";

type TeamContextType = {
  activeTeam: Team | null;
  teams: Team[];
  isLoading: boolean;
  players: Player[];
  isLoadingPlayers: boolean;
  memberships: TeamMembershipWithTournament[];
  isLoadingMemberships: boolean;
  setActiveTeamId: (id: string) => void;
  refetchTeams: () => void;
};

const TeamContext = createContext<TeamContextType | null>(null);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    return localStorage.getItem("wasa_active_managed_team_id");
  });

  // Automatically bootstrap legacy teams for platform admin
  useEffect(() => {
    if (user?.email?.toLowerCase().trim() === "ahsanhayat092@gmail.com") {
      bootstrapLegacyTeamsAdmin("ahsanhayat092@gmail.com").catch((err) => {
        console.warn("Bootstrap legacy teams:", err);
      });
    }
  }, [user?.email]);

  // Fetch teams owned/managed by this user
  const { data: teams = [], isLoading: isLoadingTeams, refetch: refetchTeams } = useQuery({
    queryKey: ["user_managed_teams", user?.email, user?.uid],
    queryFn: () => getUserManagedTeams(user?.email, user?.uid),
    enabled: !!user,
  });

  // Determine active team
  const activeTeam = useMemo(() => {
    if (teams.length === 0) return null;
    if (selectedTeamId) {
      const found = teams.find((t) => t.id === selectedTeamId);
      if (found) return found;
    }
    return teams[0];
  }, [teams, selectedTeamId]);

  // Sync selectedTeamId if activeTeam changes
  useEffect(() => {
    if (activeTeam && activeTeam.id !== selectedTeamId) {
      setSelectedTeamId(activeTeam.id);
      localStorage.setItem("wasa_active_managed_team_id", activeTeam.id);
    }
  }, [activeTeam, selectedTeamId]);

  // Fetch players for the active team
  const { data: players = [], isLoading: isLoadingPlayers } = useQuery({
    queryKey: ["team_players", activeTeam?.id],
    queryFn: () => (activeTeam?.id ? getPlayersByTeam(activeTeam.id) : Promise.resolve([])),
    enabled: !!activeTeam?.id,
  });

  // Fetch tournament memberships with tournament details for active team
  const { data: memberships = [], isLoading: isLoadingMemberships } = useQuery({
    queryKey: ["team_memberships", activeTeam?.id],
    queryFn: () => (activeTeam?.id ? getTeamMembershipsWithDetails(activeTeam.id) : Promise.resolve([])),
    enabled: !!activeTeam?.id,
  });

  const handleSetActiveTeamId = (id: string) => {
    setSelectedTeamId(id);
    localStorage.setItem("wasa_active_managed_team_id", id);
  };

  return (
    <TeamContext.Provider
      value={{
        activeTeam,
        teams,
        isLoading: isLoadingTeams,
        players,
        isLoadingPlayers,
        memberships,
        isLoadingMemberships,
        setActiveTeamId: handleSetActiveTeamId,
        refetchTeams,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return ctx;
}
