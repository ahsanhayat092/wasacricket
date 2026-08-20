import { useQuery } from "@tanstack/react-query";
import { getOverview } from "@/lib/queries";
import { MatchCard } from "@/components/MatchCard";
import { StandingsTable } from "@/components/StandingsTable";
import { TeamBadge } from "@/components/TeamBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Zap,
  Target,
  Crown,
  Calendar,
  Clock,
  MapPin,
  Shield,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router";

export default function Home() {
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: getOverview,
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { tournament, champion, live, nextMatch, latestResult, upcoming, recentResults, standings, topBatsman, topBowler } = data;

  return (
    <div>
      {/* Hero Header with Poster Details */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white border-b border-emerald-500/20">
        {/* Glow ambient effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-6xl px-4 py-12 md:py-16 text-center">
          {/* WASA Lahore Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Shield className="h-3.5 w-3.5" />
            WASA Lahore • Officers Event
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-300 drop-shadow-sm">
            {tournament.name || "WASA Premier League"}
          </h1>

          <p className="mt-3 text-lg font-bold text-amber-300 tracking-wide">
            INDOOR CRICKET CHAMPIONSHIP
          </p>

          <p className="mt-2 text-sm text-emerald-100/70 max-w-lg mx-auto font-medium">
            Team Spirit • Competition • Excellence
          </p>

          {/* Event Details Chips */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-sm shadow-sm backdrop-blur">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span className="font-bold text-slate-100">26, 27 August</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-sm shadow-sm backdrop-blur">
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-slate-100">9:00 PM to 1:00 AM</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-sm shadow-sm backdrop-blur">
              <MapPin className="h-4 w-4 text-rose-400" />
              <span className="font-bold text-slate-100">Askari XI, Lahore</span>
            </div>
          </div>

          {/* Slogan Banner */}
          <div className="mt-6 inline-block">
            <p className="font-extrabold text-xs sm:text-sm tracking-widest uppercase text-emerald-300/90 italic bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
              ⚡ PLAY HARD, WIN TOGETHER! ⚡
            </p>
          </div>

          {champion && (
            <div className="mt-6 inline-flex items-center gap-3 bg-amber-400/15 border border-amber-300/40 rounded-full px-6 py-3">
              <Crown className="h-6 w-6 text-amber-300" />
              <span className="text-lg font-bold text-amber-200">
                Champions: {champion.name}
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
        {/* Live / Next / Latest */}
        <div className="grid gap-4 md:grid-cols-2">
          {live && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <h2 className="font-bold text-red-500 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> LIVE MATCH CENTRE
                </h2>
              </div>
              <MatchCard match={live} />
            </div>
          )}
          {nextMatch && (
            <div>
              <h2 className="font-semibold mb-3 text-muted-foreground">
                {live ? "NEXT MATCH" : "UPCOMING MATCH"}
              </h2>
              <MatchCard match={nextMatch} />
            </div>
          )}
          {latestResult && (
            <div>
              <h2 className="font-semibold mb-3 text-muted-foreground">LATEST RESULT</h2>
              <MatchCard match={latestResult} />
            </div>
          )}
        </div>

        {/* Points table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" /> Points Table
            </h2>
            <Link to="/points-table" className="text-sm text-primary hover:underline font-medium">
              Full table & NRR breakdown →
            </Link>
          </div>
          <StandingsTable rows={standings} compact />
        </section>

        {/* Top performers */}
        {(topBatsman || topBowler) && (
          <section className="grid gap-4 md:grid-cols-2">
            {topBatsman && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-500 flex items-center gap-2">
                    <Zap className="h-4 w-4" /> TOP RUN SCORER
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <PlayerAvatar
                    name={topBatsman.name}
                    photoUrl={topBatsman.photoUrl}
                    size="md"
                    className="ring-2 ring-amber-400/50 shadow-sm"
                  />
                  <div>
                    <p className="text-lg font-bold">{topBatsman.name}</p>
                    <p className="text-sm text-muted-foreground">{topBatsman.teamName}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-3xl font-black text-amber-500">
                      {topBatsman.runs}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">runs</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {topBowler && (
              <Card className="border-sky-500/20 bg-sky-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-sky-500 flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> TOP WICKET TAKER
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                  <PlayerAvatar
                    name={topBowler.name}
                    photoUrl={topBowler.photoUrl}
                    size="md"
                    className="ring-2 ring-sky-400/50 shadow-sm"
                  />
                  <div>
                    <p className="text-lg font-bold">{topBowler.name}</p>
                    <p className="text-sm text-muted-foreground">{topBowler.teamName}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-3xl font-black text-sky-500">
                      {topBowler.wickets}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">wickets</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* Upcoming + recent */}
        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="text-xl font-bold mb-3">Upcoming Matches</h2>
            <div className="space-y-3">
              {upcoming.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No upcoming matches — tournament stage complete.
                </p>
              )}
              {upcoming.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-3">Recent Results</h2>
            <div className="space-y-3">
              {recentResults.length === 0 && (
                <p className="text-muted-foreground text-sm">No results yet.</p>
              )}
              {recentResults.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </section>
        </div>

        {/* Quick team links */}
        <section>
          <h2 className="text-xl font-bold mb-3">Participating Teams</h2>
          <div className="flex flex-wrap gap-3">
            {standings.map(
              (s) =>
                s.team && (
                  <Link key={s.teamId} to={`/teams/${s.teamId}`}>
                    <Badge
                      variant="outline"
                      className="px-3 py-2 flex items-center gap-2 hover:bg-accent cursor-pointer transition-colors"
                    >
                      <TeamBadge shortName={s.team.shortName} logoUrl={s.team.logoUrl} size="sm" />
                      <span className="font-semibold">{s.team.name}</span>
                    </Badge>
                  </Link>
                ),
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
