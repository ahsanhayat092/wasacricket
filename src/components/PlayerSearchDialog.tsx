import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllPlayersWithStats, type PlayerSearchItem } from "@/lib/queries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { TeamBadge } from "@/components/TeamBadge";
import { Search, Trophy, Zap, Shield, Users, ArrowRight, Sparkles } from "lucide-react";

export function PlayerSearchDialog({
  open,
  onOpenChange,
  onSelectPlayer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPlayer: (playerId: string) => void;
}) {
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["all-players-with-stats"],
    queryFn: getAllPlayersWithStats,
    enabled: open,
  });

  const [queryText, setQueryText] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const filteredPlayers = useMemo(() => {
    const q = queryText.toLowerCase().trim();
    return players.filter((p) => {
      // Role filter
      if (roleFilter !== "ALL" && p.role !== roleFilter) {
        return false;
      }
      if (!q) return true;
      const matchName = p.name.toLowerCase().includes(q);
      const matchTeam =
        p.teamName.toLowerCase().includes(q) ||
        p.teamShortName.toLowerCase().includes(q);
      const matchJersey = p.jerseyNumber?.toString() === q;
      const matchRole = p.role?.toLowerCase().includes(q);
      return matchName || matchTeam || matchJersey || matchRole;
    });
  }, [players, queryText, roleFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/20 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <Search className="h-5 w-5 text-emerald-500" />
              <span>Search Players</span>
              <Badge variant="outline" className="font-mono text-xs ml-1">
                {players.length} Total
              </Badge>
            </DialogTitle>
          </div>

          {/* Search Input Bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search by player name, team, role, or jersey number..."
              className="pl-10 pr-4 h-11 bg-background text-sm rounded-xl font-medium"
              autoFocus
            />
            {queryText && (
              <button
                type="button"
                onClick={() => setQueryText("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>

          {/* Role Filter Chips */}
          <div className="flex flex-wrap gap-1.5 mt-3 pt-1">
            {[
              { id: "ALL", label: "All Roles" },
              { id: "BATSMAN", label: "🏏 Batters" },
              { id: "BOWLER", label: "🎯 Bowlers" },
              { id: "ALL_ROUNDER", label: "⚡ All-Rounders" },
              { id: "WICKET_KEEPER", label: "🧤 Wicket-Keepers" },
            ].map((rf) => (
              <button
                key={rf.id}
                type="button"
                onClick={() => setRoleFilter(rf.id)}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                  roleFilter === rf.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Players Search Results List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-border/40">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading tournament roster...
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-semibold">No players found matching "{queryText}"</p>
              <p className="text-xs">Try searching by team name (e.g. Wolves, Lions) or playing role.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayer(player.id)}
                  className="p-3 rounded-xl border bg-card hover:bg-accent/40 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlayerAvatar
                      name={player.name}
                      photoUrl={player.photoUrl}
                      size="md"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm truncate group-hover:text-emerald-500 transition-colors">
                          {player.name}
                        </span>
                        {player.isCaptain && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[9px] font-black px-1 py-0">
                            C
                          </Badge>
                        )}
                        {player.isWicketKeeper && (
                          <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/40 text-[9px] font-black px-1 py-0">
                            WK
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <TeamBadge
                          shortName={player.teamShortName}
                          logoUrl={player.teamLogoUrl}
                          size="xs"
                        />
                        <span className="truncate font-medium">{player.teamName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                      <span className="text-amber-500">{player.totalRuns}r</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sky-500">{player.totalWickets}w</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                      {player.role ? player.role.replace("_", " ") : "Player"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
