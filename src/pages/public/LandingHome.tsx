import React, { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournaments, getAllPlatformMatches } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Zap,
  Calendar,
  Layers,
  ArrowRight,
  Shield,
  KeyRound,
  CheckCircle2,
  Users,
  Activity,
  Award,
  Sparkles,
  MapPin,
  Clock,
  Flame,
} from "lucide-react";
import {
  ballsToOversText,
  formatMatchDay,
  formatMatchDateTime,
  type MatchStatus,
} from "@/lib/cricket";
import { useAuth } from "@/hooks/useAuth";

export default function LandingHome() {
  const { user } = useAuth();
  const createTourneyHref = user ? "/admin/tournaments/new" : "/organizer/signup";
  const [matchFilter, setMatchFilter] = useState<"ALL" | "LIVE" | "UPCOMING" | "COMPLETED">("ALL");

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments"],
    queryFn: getTournaments,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["all_platform_landing_matches"],
    queryFn: getAllPlatformMatches,
    refetchInterval: 3000,
  });

  const liveMatches = matches?.filter((m) => m.status === "LIVE") ?? [];
  const completedMatches = matches?.filter((m) => m.status === "COMPLETED") ?? [];
  const upcomingMatches = matches?.filter((m) => m.status === "UPCOMING") ?? [];

  const filteredMatches = matches?.filter((m) => {
    if (matchFilter === "LIVE") return m.status === "LIVE";
    if (matchFilter === "UPCOMING") return m.status === "UPCOMING";
    if (matchFilter === "COMPLETED") return m.status === "COMPLETED";
    return true;
  }) ?? [];

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* 1. HERO SECTION (Punchy Authentic Positioning) */}
      <section className="relative overflow-hidden pt-10 pb-12 md:pt-14 md:pb-16 border-b bg-gradient-to-b from-background via-emerald-950/[0.04] to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold tracking-wide">
            <Flame className="h-3.5 w-3.5 text-amber-400" /> PitchPe — Cricket Tournaments, Scored Live
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.1] max-w-4xl mx-auto">
            From Toss to Trophy —{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              Every Ball, Every Match, One Platform.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From grassroots tape-ball leagues to corporate championships. Real-time ball-by-ball scoring, live standings, automated NRR, and stream overlays.
          </p>

          {/* CTA Hierarchy: Exactly 2 Primary Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/live-scores">
              <Button
                size="lg"
                className="h-11 px-7 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm gap-2 shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-200"
              >
                <Activity className="h-4 w-4 animate-pulse" /> Browse Live Scores
              </Button>
            </Link>

            <Link to={createTourneyHref}>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-6 font-bold text-sm gap-2 rounded-xl border-border hover:border-emerald-500/60 hover:text-emerald-400 transition-all duration-200"
              >
                <Trophy className="h-4 w-4 text-amber-400" /> Create Tournament
              </Button>
            </Link>
          </div>

          {/* Feature Bar: Clean Single Flat Horizontal Row of Icon-Label Pairs */}
          <div className="max-w-4xl mx-auto pt-6 border-t border-border/40">
            <div className="flex flex-wrap items-center justify-center gap-y-2.5 gap-x-5 sm:gap-x-7 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Live Scoring: <strong className="text-emerald-400 font-semibold">Ball-by-Ball</strong></span>
              </div>
              <span className="hidden sm:inline text-border/80">•</span>
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Custom Formats: <strong className="text-foreground font-semibold">4 to 50 Overs</strong></span>
              </div>
              <span className="hidden sm:inline text-border/80">•</span>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Scenario Engine: <strong className="text-sky-400 font-semibold">Exact Math</strong></span>
              </div>
              <span className="hidden sm:inline text-border/80">•</span>
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Public Access: <strong className="text-amber-400 font-semibold">Zero Login</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MATCH CENTER SECTION (Score-First Pro Cricket Cards) */}
      <section className="max-w-6xl mx-auto px-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-400" />
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Match Center</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live updates, upcoming fixtures, and verified tournament scorecards.
            </p>
          </div>

          {/* Right-Aligned Pill Segment Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-muted/60 border border-border/70 rounded-xl self-start sm:self-auto">
            {(["ALL", "LIVE", "UPCOMING", "COMPLETED"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setMatchFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  matchFilter === filter
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {filter === "ALL" && "All Matches"}
                {filter === "LIVE" && `Live (${liveMatches.length})`}
                {filter === "UPCOMING" && `Upcoming (${upcomingMatches.length})`}
                {filter === "COMPLETED" && `Completed (${completedMatches.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Matches Grid */}
        {filteredMatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredMatches.slice(0, 6).map((m) => {
              const isLive = m.status === "LIVE";
              const isUpcoming = m.status === "UPCOMING";
              const isCompleted = m.status === "COMPLETED";

              const inn1 = m.innings?.find((i) => i.inningsNumber === 1);
              const inn2 = m.innings?.find((i) => i.inningsNumber === 2);
              const currentInn = inn2 ?? inn1;
              const teamAScore = m.innings?.find((i) => i.battingTeamId === m.teamAId);
              const teamBScore = m.innings?.find((i) => i.battingTeamId === m.teamBId);

              // Target & live chase math
              const target = inn1 && inn2 ? inn1.runs + 1 : null;
              const runsNeeded = target && inn2 ? Math.max(0, target - inn2.runs) : null;
              const quotaBalls = (m.oversPerSide || 4) * 6;
              const ballsRemaining = inn2 ? Math.max(0, quotaBalls - inn2.balls) : null;

              return (
                <Card
                  key={m.id}
                  className={`flex flex-col justify-between rounded-xl border transition-all duration-200 hover:border-gray-700 bg-card/60 ${
                    isLive ? "border-red-500/40 bg-red-500/[0.02]" : "border-border/80"
                  }`}
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    {/* Top Row: Match # left, Status Badge right */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {m.stage === "FINAL"
                            ? "🏆 Grand Final"
                            : m.stage === "PLAYOFF"
                            ? "⚔️ Playoff Match"
                            : `Match #${m.matchNumber ?? "•"}`}
                        </span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-[11px] text-muted-foreground/80 truncate max-w-[120px]">
                          {m.tournamentName || "Championship"}
                        </span>
                      </div>

                      {/* Semantic Status Badge */}
                      {isLive && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] font-extrabold gap-1 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> LIVE
                        </Badge>
                      )}
                      {isUpcoming && (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px] font-bold">
                          UPCOMING
                        </Badge>
                      )}
                      {isCompleted && (
                        <Badge className="bg-muted/80 text-muted-foreground border-border text-[10px] font-bold">
                          COMPLETED
                        </Badge>
                      )}
                    </div>

                    {/* Pro Cricket Score-First Grid */}
                    <div className="grid grid-cols-2 gap-3 py-2 px-3 rounded-xl bg-muted/30 border border-border/60">
                      {/* Team A */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-sm text-foreground truncate">
                            {m.teamA?.shortName || m.teamA?.name || "Team A"}
                          </span>
                          {isLive && currentInn?.battingTeamId === m.teamAId && (
                            <span className="text-[11px] animate-pulse">🏏</span>
                          )}
                        </div>
                        {teamAScore ? (
                          <div>
                            <div className="text-base sm:text-lg font-black text-foreground tracking-tight leading-tight">
                              {teamAScore.runs}/{teamAScore.wickets}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              ({ballsToOversText(teamAScore.balls)} ov)
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground/70 font-medium pt-1">
                            {isUpcoming ? "Yet to bat" : "-- / --"}
                          </div>
                        )}
                      </div>

                      {/* Team B */}
                      <div className="space-y-0.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 min-w-0">
                          {isLive && currentInn?.battingTeamId === m.teamBId && (
                            <span className="text-[11px] animate-pulse">🏏</span>
                          )}
                          <span className="font-bold text-sm text-foreground truncate">
                            {m.teamB?.shortName || m.teamB?.name || "Team B"}
                          </span>
                        </div>
                        {teamBScore ? (
                          <div>
                            <div className="text-base sm:text-lg font-black text-foreground tracking-tight leading-tight">
                              {teamBScore.runs}/{teamBScore.wickets}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              ({ballsToOversText(teamBScore.balls)} ov)
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground/70 font-medium pt-1">
                            {isUpcoming ? "Yet to bat" : "-- / --"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-2.5">
                    {/* Result Line / Status Indicator */}
                    {isCompleted && (
                      <p className="text-xs font-bold text-emerald-400 truncate flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 shrink-0" />
                        <span>{m.resultText || "Match Completed"}</span>
                      </p>
                    )}

                    {isLive && (
                      <p className="text-xs font-bold text-red-400 truncate flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                        <span>
                          {runsNeeded !== null && ballsRemaining !== null
                            ? `Need ${runsNeeded} runs from ${ballsRemaining} balls`
                            : `Live In Progress · ${m.oversPerSide ?? 4} Overs`}
                        </span>
                      </p>
                    )}

                    {isUpcoming && (
                      <p className="text-xs text-muted-foreground/90 truncate flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>Scheduled Fixture · {m.oversPerSide ?? 4} Overs</span>
                      </p>
                    )}

                    {/* Bottom: Date/Venue & Scorecard Link */}
                    <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[170px]">
                        <Clock className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">
                          {formatMatchDateTime(m.day, m.date, m.time) || m.venue || "Askari XI, Lahore"}
                        </span>
                      </div>

                      <Link
                        to={`/live/${m.id}`}
                        className="group/link font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors shrink-0"
                      >
                        Scorecard <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover/link:translate-x-1" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed rounded-2xl bg-card/30 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">
              No matches found for the "{matchFilter}" filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMatchFilter("ALL")}
              className="text-xs rounded-xl"
            >
              Show All Matches
            </Button>
          </div>
        )}

        <div className="text-center pt-1">
          <Link to="/live-scores">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold">
              View All Matches & Schedule <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 3. FEATURED TOURNAMENTS SECTION */}
      <section className="max-w-6xl mx-auto px-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Featured Tournaments</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore active and archived leagues with standings and statistical leaderboards.
            </p>
          </div>
          <Link to="/tournaments">
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-emerald-400 hover:text-emerald-300 font-bold">
              Browse All Tournaments <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Responsive 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tournaments?.slice(0, 2).map((t) => {
            const acronym = t.shortName || t.name.split(" ").map((w: string) => w[0]).join("").slice(0, 3).toUpperCase() || "WPL";
            const status = (t.status || "ACTIVE").toUpperCase();
            const isCompleted = status === "COMPLETED";
            const isUpcoming = status === "UPCOMING";

            return (
              <Card
                key={t.id}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-card/60 hover:border-gray-700 transition-all duration-200 group"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-center gap-3">
                    {/* Large Acronym Badge */}
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/20">
                      {acronym}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg font-bold truncate group-hover:text-emerald-400 transition-colors">
                        {t.name}
                      </CardTitle>
                      {/* Meta Row */}
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{t.venueName || "Lahore, Pakistan"}</span>
                      </p>
                    </div>
                    {/* Semantic Status Badge */}
                    <Badge
                      className={`text-[10px] font-bold ${
                        isCompleted
                          ? "bg-muted/80 text-muted-foreground border-border"
                          : isUpcoming
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {status}
                    </Badge>
                  </div>

                  {/* Format & Overs Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-semibold">
                      {t.oversPerSide || 4} Overs
                    </span>
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-semibold">
                      {(t.formatType || "TAPE_BALL_INDOOR").replace(/_/g, " ")}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {t.description || "Official tournament records, match schedules, points tables, and player statistics."}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-border/40">
                    <span className="text-xs text-muted-foreground font-medium">Public Tournament Hub</span>
                    <Link to={`/t/${t.slug || t.id}`}>
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 h-8 rounded-lg shadow-sm">
                        Enter Portal <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center pt-1">
          <Link to="/tournaments">
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-emerald-400 hover:text-emerald-300 font-bold">
              Browse All Tournaments →
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. "BUILT FOR EVERYONE IN CRICKET" (ROLE CARDS) */}
      <section className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="text-center space-y-1.5 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
            Tailored Experiences
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Built for Everyone in Cricket</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Whether you are following live action, organizing an entire championship, or scoring ball-by-ball on the ground.
          </p>
        </div>

        {/* 3-Column Equal Height Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Role 1: Fans */}
          <Card className="border border-border/80 bg-card/60 hover:border-emerald-500/50 transition-all duration-200 space-y-4 p-5 flex flex-col justify-between rounded-xl">
            <div className="space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-muted/70 flex items-center justify-center text-emerald-400 border border-border/60">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">General Public & Fans</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Follow live scores, ball timelines, and points tables without logging in.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Real-time scorecards & wagon wheels</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Automated scenario matrix & live NRR</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>PDF fixture & rulebook downloads</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/live-scores">
                <Button variant="outline" className="w-full border-border/80 text-foreground hover:bg-muted rounded-lg py-2 text-xs font-medium">
                  View Live Scores
                </Button>
              </Link>
            </div>
          </Card>

          {/* Role 2: Tournament Organizers */}
          <Card className="border border-border/80 bg-card/60 hover:border-emerald-500/50 transition-all duration-200 space-y-4 p-5 flex flex-col justify-between rounded-xl">
            <div className="space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-muted/70 flex items-center justify-center text-emerald-400 border border-border/60">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Tournament Organizers</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Launch any tournament in 2 minutes with automated fixtures and rules.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>5-step rapid tournament wizard</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Automated round-robin scheduling</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Custom URL slug & branding hub</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link to={createTourneyHref}>
                <Button variant="outline" className="w-full border-border/80 text-foreground hover:bg-muted rounded-lg py-2 text-xs font-medium">
                  Create Tournament
                </Button>
              </Link>
            </div>
          </Card>

          {/* Role 3: Ground Scorers */}
          <Card className="border border-border/80 bg-card/60 hover:border-emerald-500/50 transition-all duration-200 space-y-4 p-5 flex flex-col justify-between rounded-xl">
            <div className="space-y-3.5">
              <div className="w-11 h-11 rounded-xl bg-muted/70 flex items-center justify-center text-emerald-400 border border-border/60">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Ground Scorers</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Dedicated mobile console with instant undo and offline resilience.
                </p>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Instant Match PIN code access</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Multi-ball undo for error correction</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Transparent OBS overlay for live stream</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/scorer/login">
                <Button variant="outline" className="w-full border-border/80 text-foreground hover:bg-muted rounded-lg py-2 text-xs font-medium">
                  Scorer Access
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 5. FINAL CALL TO ACTION SECTION */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="py-12 sm:py-16 px-6 sm:px-10 rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-950 to-background border border-emerald-500/30 text-center space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2.5 max-w-xl mx-auto relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Ready to Host Your Next Cricket Event?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed">
              Create your tournament, invite teams, set custom match rules, and broadcast live ball-by-ball scores to fans in minutes.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3.5 relative z-10 pt-1">
            <Link to="/organizer/signup">
              <Button
                size="lg"
                className="bg-white text-slate-950 hover:bg-slate-100 font-bold text-sm px-7 py-3 rounded-full shadow-xl transition-all duration-200 hover:scale-105"
              >
                Get Started as Organizer
              </Button>
            </Link>
            <Link to="/tournaments">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-bold text-sm px-7 py-3 rounded-full backdrop-blur-sm shadow-md transition-all duration-200"
              >
                Explore Public Tournaments
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
