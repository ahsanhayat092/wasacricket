import React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTournament } from "@/context/TournamentContext";
import { getUserTournaments, getUserManagedTeams, getUserScorerTournaments } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trophy, Users, Zap, ChevronDown, Check, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function WorkspaceRoleSwitcher({ className }: Props) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { tournamentId, setTournamentId, tournament } = useTournament();

  // 1. Tournaments organized by this user
  const { data: tournaments = [] } = useQuery({
    queryKey: ["user_tournaments", user?.uid, user?.email],
    queryFn: () => getUserTournaments(user?.email, user?.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // 2. Teams managed by this user
  const { data: managedTeams = [] } = useQuery({
    queryKey: ["user_managed_teams", user?.email, user?.uid],
    queryFn: () => getUserManagedTeams(user?.email, user?.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // 3. Scorer assignments for this user
  const { data: scorerTourneys = [] } = useQuery({
    queryKey: ["user_scorer_tournaments", user?.email, user?.uid],
    queryFn: () => getUserScorerTournaments(user?.email, user?.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (!user) return null;

  const isOrganizerActive = location.pathname.startsWith("/admin");
  const isTeamActive = location.pathname.startsWith("/team");
  const isScorerActive = location.pathname.startsWith("/scorer");

  const tourneyCount = tournaments.length;
  const teamCount = managedTeams.length;
  const scorerCount = scorerTourneys.length;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 p-1 bg-muted/40 backdrop-blur border border-border/70 rounded-2xl shadow-sm text-xs",
        className
      )}
    >
      {/* Role 1: Tournament Organizer */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all focus:outline-none",
              isOrganizerActive
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-300" />
            <span>Organizer</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                isOrganizerActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {tourneyCount}
            </span>
            <ChevronDown className="h-3 w-3 opacity-70 ml-0.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-1.5 rounded-2xl shadow-xl">
          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
            Tournament Organizer ({tourneyCount})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tournaments.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => {
                setTournamentId(t.id);
                localStorage.setItem("wasa_active_tournament_id", t.id);
                navigate("/admin");
              }}
              className="cursor-pointer text-xs font-semibold flex items-center justify-between py-2 rounded-xl"
            >
              <span className="truncate flex-1">{t.name}</span>
              {t.id === tournamentId && isOrganizerActive && (
                <Check className="h-4 w-4 text-emerald-500 shrink-0 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
          {tournaments.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground italic">
              No tournaments created yet
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate("/admin/tournaments")}
            className="cursor-pointer text-xs font-semibold gap-2 py-2 text-emerald-600 dark:text-emerald-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Manage All Tournaments</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/admin/tournaments/new")}
            className="cursor-pointer text-xs font-semibold gap-2 py-2 text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create New Tournament</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role 2: Team Manager */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all focus:outline-none",
              isTeamActive
                ? "bg-sky-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <Users className="h-3.5 w-3.5 text-sky-400" />
            <span>Team Manager</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                isTeamActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {teamCount}
            </span>
            <ChevronDown className="h-3 w-3 opacity-70 ml-0.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-1.5 rounded-2xl shadow-xl">
          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
            My Managed Teams ({teamCount})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {managedTeams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => {
                localStorage.setItem("wasa_active_managed_team_id", team.id);
                navigate("/team");
              }}
              className="cursor-pointer text-xs font-semibold flex items-center justify-between py-2 rounded-xl"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="h-5 w-5 rounded-full bg-sky-500/10 text-sky-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {team.shortName || team.name.charAt(0)}
                </span>
                <span className="truncate">{team.name}</span>
              </div>
            </DropdownMenuItem>
          ))}
          {managedTeams.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground italic">
              No teams created yet
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => navigate("/team")}
            className="cursor-pointer text-xs font-semibold gap-2 py-2 text-sky-600 dark:text-sky-400"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Open Team Manager Hub</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/team/players")}
            className="cursor-pointer text-xs font-semibold gap-2 py-2"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Manage Player Rosters</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Role 3: Match Scorer */}
      <Link to="/scorer/dashboard">
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all focus:outline-none",
            isScorerActive
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          <Zap className="h-3.5 w-3.5 text-amber-500 group-hover:text-amber-400" />
          <span>Scorer Cockpit</span>
          {scorerCount > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                isScorerActive ? "bg-slate-950/20 text-slate-950" : "bg-muted text-muted-foreground"
              )}
            >
              {scorerCount}
            </span>
          )}
        </button>
      </Link>
    </div>
  );
}
