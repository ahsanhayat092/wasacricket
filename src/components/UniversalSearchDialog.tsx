import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournaments, getPlayers, getTeams, getSchedule } from "@/lib/queries";
import { useTournament } from "@/context/TournamentContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search,
  Users,
  Shield,
  Zap,
  Trophy,
  ArrowRight,
  Sparkles,
  Command,
  Filter,
  Check,
} from "lucide-react";
import {
  WasaSearchEngine,
  type SearchResultItem,
  type SearchablePlayer,
  type SearchableTeam,
  type SearchableMatch,
} from "@/lib/search-engine";

export interface UniversalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentIdScoped?: string;
}

export function UniversalSearchDialog({
  open,
  onOpenChange,
  tournamentIdScoped,
}: UniversalSearchDialogProps) {
  const [queryText, setQueryText] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "player" | "team" | "match" | "tournament">("all");
  const [scopedOnly, setScopedOnly] = useState(!!tournamentIdScoped);
  const navigate = useNavigate();
  const { tournament } = useTournament();

  // Load all platform data into search engine
  const { data: tournaments } = useQuery({
    queryKey: ["all_tournaments_search"],
    queryFn: getTournaments,
    staleTime: 60 * 1000,
  });

  const { data: players } = useQuery({
    queryKey: ["all_players_search"],
    queryFn: () => getPlayers(),
    staleTime: 60 * 1000,
  });

  const { data: teams } = useQuery({
    queryKey: ["all_teams_search"],
    queryFn: () => getTeams(),
    staleTime: 60 * 1000,
  });

  const { data: matches } = useQuery({
    queryKey: ["all_matches_search"],
    queryFn: () => getSchedule(),
    staleTime: 60 * 1000,
  });

  // Build indexed search engine instance
  const engine = useMemo(() => {
    const eng = new WasaSearchEngine();

    const searchableTourneys = (tournaments ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug || t.id,
      venue: t.venueName,
    }));

    const searchableTeams: SearchableTeam[] = (teams ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName || t.name.slice(0, 3).toUpperCase(),
      tournamentId: t.tournamentId,
    }));

    const searchablePlayers: SearchablePlayer[] = (players ?? []).map((p) => {
      const pTeam = searchableTeams.find((t) => t.id === p.teamId);
      return {
        id: p.id,
        name: p.name,
        role: p.role || "Player",
        jerseyNumber: p.jerseyNumber,
        tournamentId: p.tournamentId,
        teamId: p.teamId,
        teamName: pTeam?.name,
      };
    });

    const searchableMatches: SearchableMatch[] = (matches ?? []).map((m) => {
      const tA = searchableTeams.find((t) => t.id === m.teamAId);
      const tB = searchableTeams.find((t) => t.id === m.teamBId);
      return {
        id: m.id,
        matchNumber: m.matchNumber,
        stage: m.stage,
        status: m.status,
        teamAName: tA?.name ?? m.teamA?.name ?? "Team A",
        teamBName: tB?.name ?? m.teamB?.name ?? "Team B",
        venue: m.venue,
        date: m.date,
        tournamentId: m.tournamentId,
      };
    });

    eng.indexData({
      tournaments: searchableTourneys,
      teams: searchableTeams,
      players: searchablePlayers,
      matches: searchableMatches,
    });

    return eng;
  }, [tournaments, teams, players, matches]);

  // Execute Search
  const results = useMemo(() => {
    if (!queryText.trim()) return [];
    return engine.search(queryText, {
      tournamentId: scopedOnly ? (tournamentIdScoped || tournament?.id) : undefined,
      types: activeTab === "all" ? undefined : [activeTab],
      limit: 20,
    });
  }, [engine, queryText, activeTab, scopedOnly, tournamentIdScoped, tournament?.id]);

  const handleSelect = (item: SearchResultItem) => {
    onOpenChange(false);
    navigate(item.url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-card border-border/80 shadow-2xl rounded-2xl z-[150]">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Universal Cricket Database</DialogTitle>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="p-4 border-b flex items-center gap-3 bg-muted/20">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search players, teams, match schedules, tournaments... (e.g. Babar, Lions, Match 1)"
            className="border-0 bg-transparent h-10 text-sm focus-visible:ring-0 px-0 shadow-none font-medium placeholder:text-muted-foreground/70"
          />
          {queryText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQueryText("")}
              className="h-7 px-2 text-xs font-semibold rounded-lg"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="px-4 py-2 border-b bg-muted/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                activeTab === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("player")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                activeTab === "player"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Players
            </button>
            <button
              onClick={() => setActiveTab("team")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                activeTab === "team"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => setActiveTab("match")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                activeTab === "match"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Matches
            </button>
            <button
              onClick={() => setActiveTab("tournament")}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                activeTab === "tournament"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              Tournaments
            </button>
          </div>

          {(tournamentIdScoped || tournament?.id) && (
            <button
              onClick={() => setScopedOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                scopedOnly
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              <Filter className="h-3 w-3" />
              <span>{scopedOnly ? "This Tournament Only" : "All Tournaments"}</span>
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1 divide-y divide-border/30">
          {queryText.trim() === "" ? (
            <div className="p-8 text-center space-y-2">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-xs font-bold text-foreground">Instant Search & Fast Indexing</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Type any player name, jersey number, team, fixture, or tournament. Typo tolerance and phonetic matching are active.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center space-y-1.5">
              <Search className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
              <p className="text-xs font-bold text-foreground">No matches found for &quot;{queryText}&quot;</p>
              <p className="text-[11px] text-muted-foreground">
                Try searching with a partial name or toggling &quot;All Tournaments&quot;.
              </p>
            </div>
          ) : (
            results.map((item) => {
              const iconMap = {
                player: <Users className="h-4 w-4 text-emerald-500" />,
                team: <Shield className="h-4 w-4 text-sky-500" />,
                match: <Zap className="h-4 w-4 text-amber-500" />,
                tournament: <Trophy className="h-4 w-4 text-purple-500" />,
              };

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleSelect(item)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-muted shrink-0 border">
                      {iconMap[item.type]}
                    </div>
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </span>
                        {item.badgeText && (
                          <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                            {item.badgeText}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="p-2.5 bg-muted/40 border-t flex items-center justify-between text-[11px] text-muted-foreground px-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">Esc</kbd> to close
          </span>
          <span className="font-semibold text-emerald-500">Universal Full-Text Engine</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
