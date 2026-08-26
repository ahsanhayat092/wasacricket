import React from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournaments, getSchedule } from "@/lib/queries";
import { useTournament } from "@/context/TournamentContext";
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
  Sliders,
  FileText,
  Flame,
  Award,
  Sparkles,
  MapPin,
  Clock,
} from "lucide-react";
import { statusBadgeClass, formatMatchDay, type MatchStatus } from "@/lib/cricket";

export default function LandingHome() {
  const { data: tournaments, isLoading: isTournamentsLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: getTournaments,
  });

  const { data: matches } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => getSchedule(),
  });

  const liveMatches = matches?.filter((m) => m.status === "LIVE") ?? [];
  const completedMatches = matches?.filter((m) => m.status === "COMPLETED").slice(0, 3) ?? [];
  const upcomingMatches = matches?.filter((m) => m.status === "UPCOMING").slice(0, 3) ?? [];

  return (
    <div className="space-y-16 pb-16">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b bg-gradient-to-b from-background via-emerald-950/[0.04] to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs font-bold tracking-wide">
            <Flame className="h-3.5 w-3.5" /> Next-Gen Cricket Management & Live Scoring Platform
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.08] max-w-4xl mx-auto">
            Run & Follow Cricket Tournaments with{" "}
            <span className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 bg-clip-text text-transparent">
              Real-Time Precision
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From tape-ball corporate leagues to professional 20-over tournaments. Live ball-by-ball scoring, automated NRR & scenario math, and instant public match centers.
          </p>

          {/* Primary Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link to="/live-scores">
              <Button size="lg" className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm gap-2 shadow-lg shadow-emerald-600/20 rounded-xl">
                <Activity className="h-4 w-4 animate-pulse" /> Browse Live Scores
              </Button>
            </Link>

            <Link to="/organizer/signup">
              <Button size="lg" variant="outline" className="h-12 px-6 font-bold text-sm gap-2 rounded-xl border-emerald-500/40 hover:bg-emerald-500/10">
                <Trophy className="h-4 w-4 text-emerald-500" /> Create Tournament
              </Button>
            </Link>

            <Link to="/scorer/login">
              <Button size="lg" variant="ghost" className="h-12 px-5 font-semibold text-sm gap-2 text-muted-foreground hover:text-foreground">
                <KeyRound className="h-4 w-4 text-amber-500" /> Scorer Access
              </Button>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-8 border-t border-border/40 text-left">
            <div className="p-3 rounded-xl bg-card/60 border">
              <span className="text-[11px] text-muted-foreground font-semibold block">Live Scoring</span>
              <strong className="text-lg font-black text-emerald-500">Ball-by-Ball</strong>
            </div>
            <div className="p-3 rounded-xl bg-card/60 border">
              <span className="text-[11px] text-muted-foreground font-semibold block">Custom Formats</span>
              <strong className="text-lg font-black">4 to 50 Overs</strong>
            </div>
            <div className="p-3 rounded-xl bg-card/60 border">
              <span className="text-[11px] text-muted-foreground font-semibold block">Scenario Engine</span>
              <strong className="text-lg font-black text-sky-500">Exact Math</strong>
            </div>
            <div className="p-3 rounded-xl bg-card/60 border">
              <span className="text-[11px] text-muted-foreground font-semibold block">Public Access</span>
              <strong className="text-lg font-black text-amber-500">Zero Login</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Active / Recent Matches Section */}
      <section className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              <h2 className="text-2xl font-black tracking-tight">Match Center</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live updates, upcoming fixtures, and completed tournament results.
            </p>
          </div>
          <Link to="/live-scores">
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-emerald-500 hover:text-emerald-400 font-bold">
              View All Matches <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Live Matches Highlight Banner */}
        {liveMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map((m) => (
              <Card key={m.id} className="border-emerald-500/50 bg-emerald-500/[0.04] shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1.5 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-white" /> LIVE MATCH
                </div>
                <CardHeader className="pb-2">
                  <span className="text-xs text-muted-foreground font-bold">
                    {m.stage === "FINAL" ? "🏆 Grand Final" : m.stage === "PLAYOFF" ? "⚔️ Playoff Match" : `Match #${m.matchNumber}`}
                  </span>
                  <CardTitle className="text-lg font-black">
                    {m.teamA?.name ?? "Team A"} vs {m.teamB?.name ?? "Team B"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    {m.venue ?? "Askari XI, Lahore"} · {m.oversPerSide ?? 4} Overs Match
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs font-semibold text-emerald-500">Live Scoring Active</span>
                    <Link to={`/live/${m.id}`}>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5">
                        Open Match Center <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Show recent completed & upcoming matches */}
            {completedMatches.concat(upcomingMatches).slice(0, 3).map((m) => (
              <Card key={m.id} className="hover:border-border transition-all">
                <CardHeader className="pb-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-bold">
                      {m.stage === "FINAL" ? "🏆 Grand Final" : m.stage === "PLAYOFF" ? "⚔️ Playoff" : `Match ${m.matchNumber}`}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(m.status as MatchStatus)}`}>
                      {m.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold truncate">
                    {m.teamA?.shortName ?? "TBD"} vs {m.teamB?.shortName ?? "TBD"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-1">
                  <div className="text-xs">
                    {m.resultText ? (
                      <p className="font-extrabold text-emerald-500 truncate flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 shrink-0" /> {m.resultText}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatMatchDay(m.day, m.date)} {m.time ? `· ${m.time}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t flex justify-end">
                    <Link to={`/live/${m.id}`}>
                      <Button size="sm" variant="outline" className="text-xs h-8 font-semibold">
                        Scorecard <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 3. Featured Tournaments */}
      <section className="max-w-6xl mx-auto px-4 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-2xl font-black tracking-tight">Featured Tournaments</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Explore ongoing and archived cricket tournaments with full points tables and player leaderboards.
            </p>
          </div>
          <Link to="/tournaments">
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-emerald-500 hover:text-emerald-400 font-bold">
              Browse All Tournaments <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tournaments?.slice(0, 3).map((t) => (
            <Card key={t.id} className="flex flex-col justify-between hover:border-emerald-500/50 transition-all group">
              <CardHeader className="space-y-2 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 font-black text-xs">
                    {t.shortName || "CRIC"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-extrabold truncate group-hover:text-emerald-500 transition-colors">
                      {t.name}
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-emerald-500" /> {t.venueName || "Lahore, Pakistan"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {t.oversPerSide || 4} Overs
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {(t.formatType || "TAPE_BALL_INDOOR").replace(/_/g, " ")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      t.status === "COMPLETED" ? "text-emerald-500 border-emerald-500/30" : "text-amber-500 border-amber-500/30"
                    }`}
                  >
                    {t.status || "COMPLETED"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-2 border-t">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {t.description || "Official tournament records, match schedules, points tables, and player statistics."}
                </p>

                <div className="pt-2 flex items-center justify-between border-t">
                  <span className="text-[11px] text-muted-foreground font-semibold">Public Tournament Hub</span>
                  <Link to={`/t/${t.slug || t.id}`}>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 h-8">
                      Enter Portal <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. Three Personas / How It Works */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
            Tailored Experiences
          </Badge>
          <h2 className="text-3xl font-black tracking-tight">Built for Everyone in Cricket</h2>
          <p className="text-xs text-muted-foreground">
            Whether you are following live action, organizing an entire corporate championship, or scoring ball-by-ball on the ground.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Persona 1: Public Fan */}
          <Card className="border-border/80 bg-card/60 space-y-4 p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <Zap className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-base">General Public & Fans</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Follow real-time ball-by-ball commentary, live team scores, points tables, and deep player statistics without any account creation or login hurdles.
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Live scorecard updates
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Automated scenario matrix & NRR
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> PDF fixture & rulebook exports
              </div>
            </div>
            <div className="pt-2">
              <Link to="/live-scores">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold">
                  View Live Scores
                </Button>
              </Link>
            </div>
          </Card>

          {/* Persona 2: Tournament Organizer */}
          <Card className="border-emerald-500/40 bg-emerald-500/[0.03] space-y-4 p-6 shadow-md">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
              <Trophy className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-base">Tournament Organizers</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Launch any tournament in 2 minutes. Configure custom bowler limits, max wickets, team rosters, and let our engine auto-generate balanced round-robin fixtures.
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> 5-step tournament setup wizard
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Automated schedule & time slots
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Custom branding & public URL slug
              </div>
            </div>
            <div className="pt-2">
              <Link to="/organizer/signup">
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                  Create Tournament
                </Button>
              </Link>
            </div>
          </Card>

          {/* Persona 3: Match Scorer */}
          <Card className="border-border/80 bg-card/60 space-y-4 p-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <KeyRound className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-base">Ground Scorers</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dedicated live scoring console with instant ball undo/redo, automatic strike rotation, extras accounting, and rapid 4-digit PIN match unlocking.
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> 4-digit instant Match PIN access
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Undo / Redo ball mistakes instantly
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> Distraction-free live interface
              </div>
            </div>
            <div className="pt-2">
              <Link to="/scorer/login">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold border-amber-500/40 text-amber-500 hover:bg-amber-500/10">
                  Scorer Access
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 5. Bottom Call to Action */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-950 to-background border border-emerald-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Ready to Host Your Next Cricket Event?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80">
              Create your tournament, invite teams, set custom match rules, and broadcast live ball-by-ball scores to fans in minutes.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/organizer/signup">
              <Button size="lg" className="bg-white text-emerald-950 hover:bg-emerald-50 font-black text-sm h-11 px-8 rounded-xl shadow-lg">
                Get Started as Organizer
              </Button>
            </Link>
            <Link to="/tournaments">
              <Button size="lg" variant="outline" className="border-emerald-500/40 text-white hover:bg-white/10 font-bold text-sm h-11 px-6 rounded-xl">
                Explore Public Tournaments
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
