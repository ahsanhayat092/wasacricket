import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPlayerPerformance, type PlayerPerformanceData } from "@/lib/queries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { TeamBadge } from "@/components/TeamBadge";
import { ballsToOversText, formatMatchDateTime } from "@/lib/cricket";
import {
  Trophy,
  Zap,
  Target,
  Award,
  Flame,
  Shield,
  Users,
  Activity,
  Calendar,
  Sparkles,
  ExternalLink,
  Camera,
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

  const [activeTab, setActiveTab] = useState<"overview" | "matches" | "teammates">("overview");
  const [storyOpen, setStoryOpen] = useState(false);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border shadow-2xl">
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

                {/* Quick Quick Stat Overview Pills & Share Button */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-white/10 backdrop-blur">
                    <div className="text-center px-3 py-1 border-r border-white/10">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Matches</p>
                      <p className="text-base font-mono font-black text-white">{data.matchesCount}</p>
                    </div>
                    <div className="text-center px-3 py-1 border-r border-white/10">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Runs</p>
                      <p className="text-base font-mono font-black text-amber-400">{data.batting.runs}</p>
                    </div>
                    <div className="text-center px-3 py-1">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Wickets</p>
                      <p className="text-base font-mono font-black text-sky-400">{data.bowling.wickets}</p>
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

            {/* Navigation Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "overview" | "matches" | "teammates")}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-5 pt-3 border-b bg-muted/20">
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                  <TabsTrigger value="overview" className="text-xs font-bold gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-500" /> Tournament Stats
                  </TabsTrigger>
                  <TabsTrigger value="matches" className="text-xs font-bold gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-amber-500" /> Match History ({data.matchLogs.length})
                  </TabsTrigger>
                  <TabsTrigger value="teammates" className="text-xs font-bold gap-1.5">
                    <Users className="h-3.5 w-3.5 text-sky-500" /> Squad ({data.teammates.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: Overall Tournament Statistics */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto p-5 space-y-6 m-0">
                {/* Batting Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <Zap className="h-4 w-4" /> Batting Performance
                    </h3>
                    <Badge variant="outline" className="font-mono text-xs">
                      {data.batting.inningsCount} Innings
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Total Runs</p>
                      <p className="text-xl font-mono font-black text-amber-500">{data.batting.runs}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{data.batting.balls} balls faced</p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Strike Rate</p>
                      <p className="text-xl font-mono font-black text-foreground">
                        {data.batting.strikeRate.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">runs per 100 balls</p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Highest Score</p>
                      <p className="text-xl font-mono font-black text-foreground">
                        {data.batting.highestScore}
                        {!data.batting.highestIsOut && data.batting.highestScore > 0 ? "*" : ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {data.batting.notOuts} not outs
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Boundaries</p>
                      <p className="text-xl font-mono font-black text-foreground">
                        {data.batting.fours + data.batting.sixes}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {data.batting.fours}x 4s · {data.batting.sixes}x 6s
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-xl border bg-muted/10 font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Average</span>
                      <span className="font-bold text-foreground">
                        {data.batting.average !== null ? data.batting.average.toFixed(2) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">30+ Scores</span>
                      <span className="font-bold text-foreground">{data.batting.thirties}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">50+ Scores</span>
                      <span className="font-bold text-foreground">{data.batting.fifties}</span>
                    </div>
                  </div>
                </div>

                {/* Bowling Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-sky-500 flex items-center gap-1.5">
                      <Target className="h-4 w-4" /> Bowling Performance
                    </h3>
                    <Badge variant="outline" className="font-mono text-xs">
                      {data.bowling.inningsCount} Spells
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Wickets</p>
                      <p className="text-xl font-mono font-black text-sky-500">{data.bowling.wickets}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{data.bowling.runs} runs conceded</p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Economy</p>
                      <p className="text-xl font-mono font-black text-foreground">
                        {data.bowling.economy.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">runs per over</p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Best Figures</p>
                      <p className="text-xl font-mono font-black text-foreground">
                        {data.bowling.bestFigures}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {data.bowling.overs} overs bowled
                      </p>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                      <p className="text-[11px] text-muted-foreground font-semibold">Maidens</p>
                      <p className="text-xl font-mono font-black text-foreground">{data.bowling.maidens}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {data.bowling.threeWickets}x 3-wkt hauls
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-xl border bg-muted/10 font-mono">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Bowling Avg</span>
                      <span className="font-bold text-foreground">
                        {data.bowling.average !== null ? data.bowling.average.toFixed(2) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Strike Rate</span>
                      <span className="font-bold text-foreground">
                        {data.bowling.strikeRate !== null ? data.bowling.strikeRate.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Extras Conceded</span>
                      <span className="font-bold text-foreground">
                        {data.bowling.wides}wd, {data.bowling.noBalls}nb
                      </span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Match-by-Match History */}
              <TabsContent value="matches" className="flex-1 overflow-y-auto p-5 space-y-3 m-0">
                {data.matchLogs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
                    No match records found for this player yet.
                  </div>
                ) : (
                  data.matchLogs.map((log) => (
                    <div
                      key={log.matchId}
                      className="p-4 rounded-xl border bg-card hover:border-emerald-500/30 transition-colors space-y-3 shadow-xs"
                    >
                      {/* Match Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-foreground">
                            {log.stage === "FINAL" ? "🏆 Final" : `Match #${log.matchNumber}`}
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

              {/* Tab 3: Teammates / Squad Roster */}
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
