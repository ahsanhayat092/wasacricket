import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPlayerPerformance,
  type PlayerPerformanceData,
  type PlayerBattingAggregate,
  type PlayerBowlingAggregate,
} from "@/lib/queries";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { TeamBadge } from "@/components/TeamBadge";
import { formatMatchDateTime } from "@/lib/cricket";
import {
  Trophy,
  Zap,
  Target,
  Users,
  Activity,
  Calendar,
  Sparkles,
  ExternalLink,
  Camera,
  Layers,
  Globe,
  Filter,
} from "lucide-react";
import { Link } from "react-router";
import { StoryCardModal } from "@/components/StoryCardModal";

export function PlayerPerformanceModal({
  playerId,
  open,
  onOpenChange,
  onSelectPlayer,
}: {
  playerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPlayer: (playerId: string) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["player-performance", playerId],
    queryFn: () => getPlayerPerformance(playerId),
    enabled: open && Boolean(playerId),
  });

  const [activeTab, setActiveTab] = useState<"overview" | "tournaments" | "teams" | "matches" | "teammates">("overview");
  const [selectedScope, setSelectedScope] = useState<string>("OVERALL");
  const [storyOpen, setStoryOpen] = useState(false);

  // Derive active batting & bowling statistics based on selectedScope
  const { activeBatting, activeBowling, activeMatchesCount, scopeTitle, scopeBadge } = useMemo(() => {
    if (!data) {
      return {
        activeBatting: null,
        activeBowling: null,
        activeMatchesCount: 0,
        scopeTitle: "Overall Career",
        scopeBadge: "Overall",
      };
    }

    if (selectedScope === "OVERALL") {
      return {
        activeBatting: data.batting,
        activeBowling: data.bowling,
        activeMatchesCount: data.matchesCount,
        scopeTitle: "Overall Career (All Tournaments & Teams)",
        scopeBadge: "All Tournaments",
      };
    }

    if (selectedScope.startsWith("tournament_")) {
      const tourneyId = selectedScope.replace("tournament_", "");
      const tStat = data.tournamentStats.find((t) => t.tournamentId === tourneyId);
      if (tStat) {
        return {
          activeBatting: tStat.batting,
          activeBowling: tStat.bowling,
          activeMatchesCount: tStat.matchesCount,
          scopeTitle: `${tStat.tournamentName} Stats`,
          scopeBadge: tStat.tournamentName,
        };
      }
    }

    if (selectedScope.startsWith("team_")) {
      const tId = selectedScope.replace("team_", "");
      const teamStat = data.teamStats.find((t) => t.teamId === tId);
      if (teamStat) {
        return {
          activeBatting: teamStat.batting,
          activeBowling: teamStat.bowling,
          activeMatchesCount: teamStat.matchesCount,
          scopeTitle: `${teamStat.teamName} Club Stats`,
          scopeBadge: teamStat.teamName,
        };
      }
    }

    return {
      activeBatting: data.batting,
      activeBowling: data.bowling,
      activeMatchesCount: data.matchesCount,
      scopeTitle: "Overall Career",
      scopeBadge: "Overall",
    };
  }, [data, selectedScope]);

  // Filtered match logs based on scope
  const filteredMatchLogs = useMemo(() => {
    if (!data) return [];
    if (selectedScope === "OVERALL") return data.matchLogs;

    if (selectedScope.startsWith("tournament_")) {
      const tId = selectedScope.replace("tournament_", "");
      return data.matchLogs.filter((m) => (m.tournamentId || "main") === tId);
    }

    if (selectedScope.startsWith("team_")) {
      const teamId = selectedScope.replace("team_", "");
      return data.matchLogs.filter((m) => m.playerTeam?.id === teamId);
    }

    return data.matchLogs;
  }, [data, selectedScope]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border shadow-2xl">
        {isLoading || !data ? (
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Header: Hero Banner with Player Profile */}
            <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 border-b text-white relative overflow-hidden">
              {/* Ambient Glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative">
                    <PlayerAvatar
                      name={data.player.name}
                      photoUrl={data.player.photoUrl}
                      size="xl"
                      className="border-2 border-emerald-500/50 ring-4 ring-emerald-500/20 shadow-lg"
                    />
                    {data.player.jerseyNumber && (
                      <span className="absolute -bottom-1 -right-1 bg-slate-900 text-amber-400 font-mono font-black text-xs px-1.5 py-0.5 rounded-full border border-amber-400/40 shadow-sm">
                        #{data.player.jerseyNumber}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                        {data.player.name}
                      </h2>
                      {data.player.isCaptain && (
                        <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider px-2 py-0.5">
                          Captain
                        </Badge>
                      )}
                      {data.player.isWicketKeeper && (
                        <Badge className="bg-sky-500 text-slate-950 font-black text-[10px] uppercase tracking-wider px-2 py-0.5">
                          Wicket Keeper
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      {data.team && (
                        <Link
                          to={`/teams/${data.team.id}`}
                          onClick={() => onOpenChange(false)}
                          className="inline-flex items-center gap-1.5 font-bold hover:text-emerald-400 transition-colors"
                        >
                          <TeamBadge
                            shortName={data.team.shortName}
                            logoUrl={data.team.logoUrl}
                            size="xs"
                          />
                          <span>{data.team.name}</span>
                        </Link>
                      )}
                      <span className="text-slate-500">•</span>
                      <span className="font-semibold text-emerald-400">
                        {data.player.role ? data.player.role.replace("_", " ") : "All-Rounder"}
                      </span>
                    </div>

                    {data.potmCount > 0 && (
                      <div className="pt-1">
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-bold gap-1 px-2 py-0.5">
                          <Trophy className="h-3 w-3 text-amber-400" />
                          {data.potmCount}x Player of the Match
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Career Stat Overview Pills & Share Button */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-white/10 backdrop-blur">
                    <div className="text-center px-3 py-1 border-r border-white/10">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Matches</p>
                      <p className="text-base font-mono font-black text-white">{activeMatchesCount}</p>
                    </div>
                    <div className="text-center px-3 py-1 border-r border-white/10">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Runs</p>
                      <p className="text-base font-mono font-black text-amber-400">{activeBatting?.runs ?? 0}</p>
                    </div>
                    <div className="text-center px-3 py-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Wickets</p>
                      <p className="text-base font-mono font-black text-sky-400">{activeBowling?.wickets ?? 0}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStoryOpen(true)}
                    className="gap-1.5 text-xs font-bold bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Story Card</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Scope Filter Bar (Overall / By Tournament / By Team) */}
            <div className="px-5 py-2.5 bg-muted/40 border-b flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-bold text-muted-foreground">View Statistics:</span>
                <select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                  className="h-8 px-2.5 text-xs font-bold rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="OVERALL">🌐 Overall Career (All Tournaments & Teams)</option>
                  {data.tournamentStats.length > 0 && (
                    <optgroup label="🏆 By Tournament">
                      {data.tournamentStats.map((t) => (
                        <option key={t.tournamentId} value={`tournament_${t.tournamentId}`}>
                          🏆 {t.tournamentName} ({t.matchesCount} matches)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {data.teamStats.length > 0 && (
                    <optgroup label="🛡️ By Team / Club">
                      {data.teamStats.map((t) => (
                        <option key={t.teamId} value={`team_${t.teamId}`}>
                          🛡️ {t.teamName} ({t.matchesCount} matches)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <Badge variant="outline" className="text-[11px] font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                {scopeBadge}
              </Badge>
            </div>

            {/* Navigation Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "overview" | "tournaments" | "teams" | "matches" | "teammates")}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-5 pt-3 border-b bg-muted/10">
                <TabsList className="grid w-full grid-cols-5 max-w-2xl">
                  <TabsTrigger value="overview" className="text-xs font-bold gap-1">
                    <Activity className="h-3.5 w-3.5 text-emerald-500" /> Stats
                  </TabsTrigger>
                  <TabsTrigger value="tournaments" className="text-xs font-bold gap-1">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" /> Tournaments ({data.tournamentStats.length})
                  </TabsTrigger>
                  <TabsTrigger value="teams" className="text-xs font-bold gap-1">
                    <Layers className="h-3.5 w-3.5 text-sky-500" /> Teams ({data.teamStats.length})
                  </TabsTrigger>
                  <TabsTrigger value="matches" className="text-xs font-bold gap-1">
                    <Calendar className="h-3.5 w-3.5 text-purple-500" /> Matches ({filteredMatchLogs.length})
                  </TabsTrigger>
                  <TabsTrigger value="teammates" className="text-xs font-bold gap-1">
                    <Users className="h-3.5 w-3.5 text-teal-500" /> Squad
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: Detailed Statistics (Filtered by Scope) */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto p-5 space-y-6 m-0">
                {/* Batting Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <Zap className="h-4 w-4" /> Batting Performance — {scopeTitle}
                    </h3>
                    <Badge variant="outline" className="font-mono text-xs">
                      {activeBatting?.inningsCount ?? 0} Innings
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Total Runs</p>
                      <p className="text-xl font-mono font-black text-amber-500">{activeBatting?.runs ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{activeBatting?.balls ?? 0} balls faced</p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Strike Rate</p>
                      <p className="text-xl font-mono font-black text-foreground">
                        {activeBatting?.strikeRate ? activeBatting.strikeRate.toFixed(1) : "0.0"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">runs per 100 balls</p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Highest Score</p>
                      <p className="text-xl font-mono font-black text-foreground">
                        {activeBatting?.highestScore ?? 0}
                        {!activeBatting?.highestIsOut && (activeBatting?.highestScore ?? 0) > 0 ? "*" : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {activeBatting?.notOuts ?? 0} not outs
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Boundaries</p>
                      <p className="text-xl font-mono font-black text-foreground">
                        {(activeBatting?.fours ?? 0) + (activeBatting?.sixes ?? 0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {activeBatting?.fours ?? 0}x 4s · {activeBatting?.sixes ?? 0}x 6s
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-xl border bg-muted/10 font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Average</span>
                      <span className="font-bold text-foreground">
                        {activeBatting?.average !== null && activeBatting?.average !== undefined ? activeBatting.average.toFixed(2) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">30+ Scores</span>
                      <span className="font-bold text-foreground">{activeBatting?.thirties ?? 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">50+ Scores</span>
                      <span className="font-bold text-foreground">{activeBatting?.fifties ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Bowling Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-sky-500 flex items-center gap-1.5">
                      <Target className="h-4 w-4" /> Bowling Performance — {scopeTitle}
                    </h3>
                    <Badge variant="outline" className="font-mono text-xs">
                      {activeBowling?.inningsCount ?? 0} Spells
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Wickets</p>
                      <p className="text-xl font-mono font-black text-sky-500">{activeBowling?.wickets ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{activeBowling?.runs ?? 0} runs conceded</p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Economy</p>
                      <p className="text-xl font-mono font-black text-foreground">
                        {activeBowling?.economy ? activeBowling.economy.toFixed(2) : "0.00"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">runs per over</p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Best Figures</p>
                      <p className="text-xl font-mono font-black text-foreground">
                        {activeBowling?.bestFigures || "0/0"}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {activeBowling?.overs || "0.0"} overs bowled
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Maidens</p>
                      <p className="text-xl font-mono font-black text-foreground">{activeBowling?.maidens ?? 0}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {activeBowling?.threeWickets ?? 0}x 3-wkt hauls
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-xl border bg-muted/10 font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Bowling Avg</span>
                      <span className="font-bold text-foreground">
                        {activeBowling?.average !== null && activeBowling?.average !== undefined ? activeBowling.average.toFixed(2) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Strike Rate</span>
                      <span className="font-bold text-foreground">
                        {activeBowling?.strikeRate !== null && activeBowling?.strikeRate !== undefined ? activeBowling.strikeRate.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Extras Conceded</span>
                      <span className="font-bold text-foreground">
                        {activeBowling?.wides ?? 0}wd, {activeBowling?.noBalls ?? 0}nb
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Tournament-Wise Breakdown */}
              <TabsContent value="tournaments" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm">Tournament Performance History</h3>
                  <p className="text-xs text-muted-foreground">
                    Player records and statistics across all individual tournaments participated in.
                  </p>
                </div>

                {data.tournamentStats.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
                    No tournament records found for this player yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {data.tournamentStats.map((t) => (
                      <div
                        key={t.tournamentId}
                        className="p-4 rounded-xl border bg-card hover:border-emerald-500/40 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-amber-400" />
                            <h4 className="font-black text-sm">{t.tournamentName}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            {t.potmCount > 0 && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                                {t.potmCount}x POTM
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs font-bold">
                              {t.matchesCount} Matches
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <span className="text-muted-foreground text-[10px] block">Runs (Avg / SR)</span>
                            <span className="font-mono font-bold text-amber-500 text-sm">
                              {t.batting.runs}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              Avg {t.batting.average ? t.batting.average.toFixed(1) : "—"} · SR {t.batting.strikeRate.toFixed(0)}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <span className="text-muted-foreground text-[10px] block">Highest / 50s</span>
                            <span className="font-mono font-bold text-foreground text-sm">
                              {t.batting.highestScore}{!t.batting.highestIsOut && t.batting.highestScore > 0 ? "*" : ""}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {t.batting.fifties}x 50s · {t.batting.fours + t.batting.sixes} boundaries
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-sky-500/5 border border-sky-500/10">
                            <span className="text-muted-foreground text-[10px] block">Wickets / Econ</span>
                            <span className="font-mono font-bold text-sky-400 text-sm">
                              {t.bowling.wickets}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              Econ {t.bowling.economy.toFixed(1)} · {t.bowling.overs} ov
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-sky-500/5 border border-sky-500/10">
                            <span className="text-muted-foreground text-[10px] block">Best Bowling</span>
                            <span className="font-mono font-bold text-foreground text-sm">
                              {t.bowling.bestFigures}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {t.bowling.maidens} maidens
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: Team-Wise Breakdown */}
              <TabsContent value="teams" className="flex-1 overflow-y-auto p-5 space-y-4 m-0">
                <div className="space-y-1">
                  <h3 className="font-bold text-sm">Team / Club Performance Breakdown</h3>
                  <p className="text-xs text-muted-foreground">
                    Player statistics maintained per team represented across different tournaments.
                  </p>
                </div>

                {data.teamStats.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
                    No team records found for this player yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {data.teamStats.map((tm) => (
                      <div
                        key={tm.teamId}
                        className="p-4 rounded-xl border bg-card hover:border-emerald-500/40 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2.5">
                            <TeamBadge shortName={tm.teamShortName} logoUrl={tm.teamLogoUrl} size="sm" />
                            <div>
                              <h4 className="font-black text-sm">{tm.teamName}</h4>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold font-mono">
                                Code: {tm.teamShortName}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs font-bold">
                            {tm.matchesCount} Matches
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 rounded-lg bg-card border space-y-0.5">
                            <span className="text-muted-foreground text-[10px] block">Runs Scored</span>
                            <span className="font-mono font-bold text-amber-500 text-sm">{tm.batting.runs}</span>
                            <span className="text-[10px] text-muted-foreground block">
                              Avg {tm.batting.average ? tm.batting.average.toFixed(1) : "—"}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-card border space-y-0.5">
                            <span className="text-muted-foreground text-[10px] block">Strike Rate</span>
                            <span className="font-mono font-bold text-foreground text-sm">
                              {tm.batting.strikeRate.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              High: {tm.batting.highestScore}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-card border space-y-0.5">
                            <span className="text-muted-foreground text-[10px] block">Wickets Taken</span>
                            <span className="font-mono font-bold text-sky-400 text-sm">{tm.bowling.wickets}</span>
                            <span className="text-[10px] text-muted-foreground block">
                              Econ {tm.bowling.economy.toFixed(1)}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-card border space-y-0.5">
                            <span className="text-muted-foreground text-[10px] block">Best Figures</span>
                            <span className="font-mono font-bold text-foreground text-sm">{tm.bowling.bestFigures}</span>
                            <span className="text-[10px] text-muted-foreground block">
                              {tm.bowling.overs} overs
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab 4: Match-by-Match History */}
              <TabsContent value="matches" className="flex-1 overflow-y-auto p-5 space-y-3 m-0">
                {filteredMatchLogs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
                    No match records found for this selection.
                  </div>
                ) : (
                  filteredMatchLogs.map((log) => (
                    <div
                      key={log.matchId}
                      className="p-4 rounded-xl border bg-card hover:border-emerald-500/30 transition-colors space-y-3 shadow-xs"
                    >
                      {/* Match Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                            {log.tournamentName || "Tournament"}
                          </Badge>
                          <span className="font-black text-foreground">
                            {log.stage === "FINAL" ? "🏆 Grand Final" : log.stage === "PLAYOFF" ? "⚔️ Playoff" : `Match #${log.matchNumber}`}
                          </span>
                          <span className="text-muted-foreground font-semibold">vs</span>
                          <div className="flex items-center gap-1 font-bold text-foreground">
                            <TeamBadge
                              shortName={log.opponentTeam?.shortName ?? "TBD"}
                              logoUrl={log.opponentTeam?.logoUrl}
                              size="xs"
                            />
                            <span>{log.opponentTeam?.name ?? "Opponent"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-medium text-muted-foreground">
                          <span>{formatMatchDateTime(null, log.date, log.time)}</span>
                          {log.isPlayerOfMatch && (
                            <Badge className="bg-amber-500 text-slate-950 font-black text-[9px] gap-1 px-1.5 py-0">
                              <Trophy className="h-3 w-3" /> POTM
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Batting & Bowling Contributions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Batting in this match */}
                        <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 space-y-1">
                          <span className="font-bold text-amber-500 uppercase tracking-wider text-[10px] block">
                            🏏 Batting
                          </span>
                          {log.batting ? (
                            <div>
                              <div className="flex items-baseline justify-between font-mono">
                                <span className="text-base font-black text-amber-400">
                                  {log.batting.runs}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({log.batting.balls}b)
                                  </span>
                                </span>
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                  {log.batting.fours}x 4s · {log.batting.sixes}x 6s · SR{" "}
                                  {log.batting.strikeRate.toFixed(1)}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                {log.batting.isOut
                                  ? log.batting.dismissal ?? "out"
                                  : "not out"}
                              </p>
                            </div>
                          ) : (
                            <p className="text-muted-foreground italic text-[11px]">Did not bat</p>
                          )}
                        </div>

                        {/* Bowling in this match */}
                        <div className="p-2.5 rounded-lg bg-sky-500/5 border border-sky-500/15 space-y-1">
                          <span className="font-bold text-sky-500 uppercase tracking-wider text-[10px] block">
                            🎯 Bowling
                          </span>
                          {log.bowling && log.bowling.balls > 0 ? (
                            <div>
                              <div className="flex items-baseline justify-between font-mono">
                                <span className="text-base font-black text-sky-400">
                                  {log.bowling.wickets}/{log.bowling.runs}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({log.bowling.overs} ov)
                                  </span>
                                </span>
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                  Econ {log.bowling.economy.toFixed(2)} · M: {log.bowling.maidens}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                {log.bowling.wides}wd, {log.bowling.noBalls}nb
                              </p>
                            </div>
                          ) : (
                            <p className="text-muted-foreground italic text-[11px]">Did not bowl</p>
                          )}
                        </div>
                      </div>

                      {/* Result summary and link */}
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="font-bold text-emerald-400 truncate max-w-sm">
                          {log.resultText ?? log.status}
                        </span>
                        <Link
                          to={`/matches/${log.matchId}`}
                          onClick={() => onOpenChange(false)}
                          className="text-[11px] text-primary hover:underline font-bold inline-flex items-center gap-1"
                        >
                          Scorecard <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Tab 5: Teammates / Squad Roster */}
              <TabsContent value="teammates" className="flex-1 overflow-y-auto p-5 space-y-2 m-0">
                <p className="text-xs text-muted-foreground mb-3 font-medium">
                  {data.team?.name ?? "Team"} Squad Members — Click any player to inspect their tournament profile:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.teammates.map((teammate) => {
                    const isCurrent = teammate.id === data.player.id;
                    return (
                      <div
                        key={teammate.id}
                        onClick={() => {
                          if (!isCurrent) onSelectPlayer(teammate.id);
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isCurrent
                            ? "bg-primary/10 border-primary/50 cursor-default"
                            : "bg-card hover:bg-accent/40 hover:border-emerald-500/40 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PlayerAvatar
                            name={teammate.name}
                            photoUrl={teammate.photoUrl}
                            size="sm"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm truncate">
                              {teammate.name}
                              {isCurrent && " (Viewing)"}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                              {teammate.role ? teammate.role.replace("_", " ") : "Player"}
                            </span>
                          </div>
                        </div>

                        {teammate.jerseyNumber && (
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            #{teammate.jerseyNumber}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <StoryCardModal
              open={storyOpen}
              onOpenChange={setStoryOpen}
              playerData={data}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
