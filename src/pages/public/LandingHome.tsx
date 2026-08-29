import React, { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournaments, getSchedule } from "@/lib/queries";
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
  Wifi,
  WifiOff,
  Smartphone,
  RefreshCw,
  Flame,
} from "lucide-react";
import { formatMatchDay, type MatchStatus } from "@/lib/cricket";
import { useAuth } from "@/hooks/useAuth";

export default function LandingHome() {
  const { user } = useAuth();
  const createTourneyHref = user ? "/admin/tournaments/new" : "/organizer/signup";
  const [matchFilter, setMatchFilter] = useState<"ALL" | "LIVE" | "UPCOMING" | "COMPLETED">("ALL");

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments"],
    queryFn: getTournaments,
  });

  const { data: matches } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => getSchedule(),
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
    <div className="space-y-20 sm:space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b bg-gradient-to-b from-background via-emerald-950/[0.04] to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold tracking-wide">
            <Flame className="h-3.5 w-3.5 text-amber-400" /> PitchPe — Cricket Tournament & Live Scoring Platform
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.08] max-w-4xl mx-auto">
            Run & Follow Cricket Tournaments with{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
              Real-Time Precision
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From tape-ball corporate leagues to professional 20-over tournaments. Live ball-by-ball scoring, automated NRR & scenario math, and instant public match centers.
          </p>

          {/* CTA Hierarchy: Exactly 2 Primary Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-3">
            <Link to="/live-scores">
              <Button
                size="lg"
                className="h-12 px-7 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm gap-2 shadow-lg shadow-emerald-500/20 rounded-xl transition-all duration-300"
              >
                <Activity className="h-4 w-4 animate-pulse" /> Browse Live Scores
              </Button>
            </Link>

            <Link to={createTourneyHref}>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 font-bold text-sm gap-2 rounded-xl border-border hover:border-emerald-500/60 hover:text-emerald-400 transition-all duration-300"
              >
                <Trophy className="h-4 w-4 text-amber-400" /> Create Tournament
              </Button>
            </Link>
          </div>

          {/* Feature Bar: Clean Horizontal Row of Small Icon-Label Pairs */}
          <div className="max-w-4xl mx-auto pt-8 border-t border-border/40">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card/40 border border-border/60">
                <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Live Scoring: <strong className="text-emerald-400 font-bold">Ball-by-Ball</strong></span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card/40 border border-border/60">
                <Layers className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Custom Formats: <strong className="text-foreground font-bold">4 to 50 Overs</strong></span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card/40 border border-border/60">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Scenario Engine: <strong className="text-sky-400 font-bold">Exact Math</strong></span>
              </div>
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-card/40 border border-border/60">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Public Access: <strong className="text-amber-400 font-bold">Zero Login</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MATCH CENTER SECTION */}
      <section className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
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

              return (
                <Card
                  key={m.id}
                  className={`flex flex-col justify-between rounded-xl border transition-all duration-300 hover:border-gray-700 bg-card/60 ${
                    isLive ? "border-red-500/40 bg-red-500/[0.02]" : "border-border/80"
                  }`}
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    {/* Top Row: Match # left, Status Badge right */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {m.stage === "FINAL"
                          ? "🏆 Grand Final"
                          : m.stage === "PLAYOFF"
                          ? "⚔️ Playoff Match"
                          : `Match #${m.matchNumber ?? "•"}`}
                      </span>

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

                    {/* Middle: Team A vs Team B */}
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground leading-snug">
                      {m.teamA?.name ?? m.teamA?.shortName ?? "Team A"} vs{" "}
                      {m.teamB?.name ?? m.teamB?.shortName ?? "Team B"}
                    </CardTitle>

                    {/* Below Teams: Tournament Name */}
                    <p className="text-xs text-muted-foreground/80 truncate">
                      {m.tournamentName || "PitchPe Tournament Championship"}
                    </p>
                  </CardHeader>

                  <CardContent className="p-4 pt-1 space-y-3">
                    {/* Result Line */}
                    {isCompleted && (
                      <p className="text-xs font-bold text-emerald-400 truncate flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 shrink-0" />
                        <span>{m.resultText || "Match Completed"}</span>
                      </p>
                    )}

                    {isLive && (
                      <p className="text-xs font-bold text-red-400 truncate flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                        <span>Live in progress · {m.oversPerSide ?? 4} Overs</span>
                      </p>
                    )}

                    {isUpcoming && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span>
                          {formatMatchDay(m.day, m.date)} {m.time ? `· ${m.time}` : ""}
                        </span>
                      </p>
                    )}

                    {/* Bottom: Date/Venue & Scorecard Link */}
                    <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-muted-foreground truncate max-w-[130px]">
                        {m.venue || "Askari XI, Lahore"}
                      </span>

                      <Link
                        to={`/live/${m.id}`}
                        className="font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                      >
                        Scorecard <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed rounded-2xl bg-card/30 space-y-2">
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

        <div className="text-center pt-2">
          <Link to="/live-scores">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold">
              View All Matches & Schedule <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 3. FEATURED TOURNAMENTS SECTION */}
      <section className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tournaments?.slice(0, 2).map((t) => {
            const acronym = t.shortName || t.name.split(" ").map((w: string) => w[0]).join("").slice(0, 3).toUpperCase() || "WPL";
            const isCompleted = t.status === "COMPLETED";

            return (
              <Card
                key={t.id}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-card/60 hover:border-gray-700 transition-all duration-300 group"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-center gap-3">
                    {/* Large Acronym Badge */}
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/20">
                      {acronym}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-bold truncate group-hover:text-emerald-400 transition-colors">
                        {t.name}
                      </CardTitle>
                      {/* Meta Row */}
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{t.venueName || "Lahore, Pakistan"}</span>
                      </p>
                    </div>
                    {/* Status Badge */}
                    <Badge
                      className={`text-[10px] font-bold ${
                        isCompleted
                          ? "bg-muted text-muted-foreground border-border"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {t.status || "ACTIVE"}
                    </Badge>
                  </div>

                  {/* Format & Overs Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-semibold">
                      {t.oversPerSide || 4} Overs
                    </span>
                    <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-xs font-semibold">
                      {(t.formatType || "TAPE_BALL_INDOOR").replace(/_/g, " ")}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {t.description || "Official tournament records, match schedules, points tables, and player statistics."}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-border/40">
                    <span className="text-xs text-muted-foreground font-medium">Public Tournament Hub</span>
                    <Link to={`/t/${t.slug || t.id}`}>
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 h-8.5 rounded-lg shadow-sm">
                        Enter Portal <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <Link to="/tournaments">
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-emerald-400 hover:text-emerald-300 font-bold">
              Browse All Tournaments →
            </Button>
          </Link>
        </div>
      </section>

      {/* 4. "BUILT FOR EVERYONE IN CRICKET" (ROLE CARDS) */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
            Tailored Experiences
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">Built for Everyone in Cricket</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Whether you are following live action, organizing an entire championship, or scoring ball-by-ball on the ground.
          </p>
        </div>

        {/* 3-Column Equal Height Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Role 1: Fans */}
          <Card className="border border-border/80 bg-card/60 hover:border-emerald-500/50 transition-all duration-300 space-y-5 p-6 flex flex-col justify-between rounded-xl">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-muted/70 flex items-center justify-center text-emerald-400 border border-border/60">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">General Public & Fans</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Follow live scores, ball timelines, and points tables without logging in.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Real-time scorecards & wagon wheels</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Automated scenario matrix & live NRR</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>PDF fixture & rulebook downloads</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/live-scores">
                <Button variant="outline" className="w-full border-border/80 text-foreground hover:bg-muted rounded-lg py-2 text-sm font-medium">
                  View Live Scores
                </Button>
              </Link>
            </div>
          </Card>

          {/* Role 2: Tournament Organizers */}
          <Card className="border border-border/80 bg-card/60 hover:border-emerald-500/50 transition-all duration-300 space-y-5 p-6 flex flex-col justify-between rounded-xl">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-muted/70 flex items-center justify-center text-emerald-400 border border-border/60">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Tournament Organizers</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Launch any tournament in 2 minutes with automated fixtures and rules.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>5-step rapid tournament wizard</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Automated round-robin scheduling</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Custom URL slug & branding hub</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link to={createTourneyHref}>
                <Button variant="outline" className="w-full border-border/80 text-foreground hover:bg-muted rounded-lg py-2 text-sm font-medium">
                  Create Tournament
                </Button>
              </Link>
            </div>
          </Card>

          {/* Role 3: Ground Scorers */}
          <Card className="border border-border/80 bg-card/60 hover:border-emerald-500/50 transition-all duration-300 space-y-5 p-6 flex flex-col justify-between rounded-xl">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-muted/70 flex items-center justify-center text-emerald-400 border border-border/60">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Ground Scorers</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Dedicated mobile console with instant undo and offline resilience.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Instant Match PIN code access</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Multi-ball undo for error correction</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Transparent OBS overlay for live stream</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/scorer/login">
                <Button variant="outline" className="w-full border-border/80 text-foreground hover:bg-muted rounded-lg py-2 text-sm font-medium">
                  Scorer Access
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 5. KILLER FEATURE: OFFLINE-FIRST MATCH SCORING */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950 p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Headline & Pitch */}
          <div className="text-center space-y-3 max-w-2xl mx-auto relative z-10">
            <Badge className="bg-emerald-500 text-slate-950 font-black text-xs px-3 py-1 gap-1.5 uppercase tracking-wider">
              <WifiOff className="h-3.5 w-3.5" /> Built For Real-World Grounds
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              📶 Cricket Doesn't Stop When the Internet Does.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Score your entire match offline without missing a single ball. When connectivity returns, your scorecards, ball timelines, and standings synchronize automatically.
            </p>
          </div>

          {/* Visual Step-by-Step Flow: ONLINE -> OFFLINE -> SCORE -> RECONNECT -> SYNCED */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-2 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mx-auto">
                <Wifi className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400">Step 1</span>
                <h4 className="text-xs font-black text-white">ONLINE</h4>
                <p className="text-[11px] text-slate-400">Match & lineups locked</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-center space-y-2 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center mx-auto">
                <WifiOff className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400">Step 2</span>
                <h4 className="text-xs font-black text-white">OFFLINE MODE</h4>
                <p className="text-[11px] text-slate-400">Ground signal drops</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/10 text-center space-y-2 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center mx-auto">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-sky-400">Step 3</span>
                <h4 className="text-xs font-black text-white">SCORE BALLS</h4>
                <p className="text-[11px] text-slate-400">0ms instant touch taps</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-center space-y-2 flex flex-col justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center mx-auto">
                <RefreshCw className="h-5 w-5 animate-spin" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-400">Step 4</span>
                <h4 className="text-xs font-black text-white">RECONNECT</h4>
                <p className="text-[11px] text-slate-400">Network handshake</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-400 bg-emerald-500 text-center space-y-2 flex flex-col justify-between text-slate-950 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-emerald-400 font-bold flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-slate-900">Step 5</span>
                <h4 className="text-xs font-black text-slate-950">AUTO SYNCED</h4>
                <p className="text-[11px] text-slate-900 font-medium">Cloud & fans updated</p>
              </div>
            </div>
          </div>

          {/* 3 Key Benefits Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Zero Ground Lag</strong>
                <span className="text-slate-400 text-[11px]">Instant 0ms touch response on every ball without waiting for network roundtrips.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">100% Data Loss Protection</strong>
                <span className="text-slate-400 text-[11px]">Every run, wicket, and over is buffered locally in storage until cloud handshake.</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Instant OBS & Fan Catchup</strong>
                <span className="text-slate-400 text-[11px]">Upon reconnection, public scorecards, NRR calculations, and broadcast graphics fast-forward.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINAL CALL TO ACTION SECTION */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="py-16 sm:py-20 px-6 sm:px-12 rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-950 to-background border border-emerald-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 max-w-xl mx-auto relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Ready to Host Your Next Cricket Event?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed">
              Create your tournament, invite teams, set custom match rules, and broadcast live ball-by-ball scores to fans in minutes.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 relative z-10 pt-2">
            <Link to="/organizer/signup">
              <Button
                size="lg"
                className="bg-white text-slate-950 hover:bg-slate-100 font-bold text-sm px-8 py-3.5 rounded-full shadow-xl transition-all duration-300 hover:scale-105"
              >
                Get Started as Organizer
              </Button>
            </Link>
            <Link to="/tournaments">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 font-bold text-sm px-8 py-3.5 rounded-full backdrop-blur-sm shadow-md transition-all duration-300"
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
