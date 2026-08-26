import { useQuery } from "@tanstack/react-query";
import { getOverview, getSchedule } from "@/lib/queries";
import { MatchCard } from "@/components/MatchCard";
import { StandingsTable } from "@/components/StandingsTable";
import { TeamBadge } from "@/components/TeamBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { triggerChampionConfetti } from "@/lib/confetti";
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
  PartyPopper,
  Medal,
  ArrowRight,
  Share2,
} from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { ShareTournamentModal } from "@/components/ShareTournamentModal";

export default function Home() {
  const [shareOpen, setShareOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: getOverview,
    refetchInterval: 15000,
  });

  const { data: scheduleMatches } = useQuery({
    queryKey: ["schedule"],
    queryFn: getSchedule,
  });

  // Trigger celebration confetti once on load if tournament champion is crowned
  useEffect(() => {
    if (data?.champion) {
      const timer = setTimeout(() => {
        triggerChampionConfetti();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [data?.champion]);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const {
    tournament,
    champion,
    runnerUp,
    finalMatch,
    live,
    nextMatch,
    latestResult,
    upcoming,
    recentResults,
    standings,
    topBatsman,
    topBowler,
  } = data;

  const allDates = Array.from(
    new Set(scheduleMatches?.map((m) => m.date?.trim()).filter(Boolean) ?? []),
  );
  const allVenues = Array.from(
    new Set(scheduleMatches?.map((m) => m.venue?.trim()).filter(Boolean) ?? []),
  );
  const allTimes = Array.from(
    new Set(scheduleMatches?.map((m) => m.time?.trim()).filter(Boolean) ?? []),
  );

  return (
    <div className="space-y-8">
      {/* Tournament Champions Celebration Showcase Banner (When Champion is crowned) */}
      {champion && (
        <section className="relative overflow-hidden bg-gradient-to-r from-amber-950 via-slate-950 to-amber-950 border-b-2 border-amber-500/50 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-14 text-center space-y-6">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border-2 border-amber-400/50 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-lg animate-bounce">
              <Crown className="h-4 w-4 text-amber-400" />
              <span>TOURNAMENT CHAMPIONS • WASA PREMIER LEAGUE 2026</span>
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>

            {/* Champion Team Spotlight Card */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 bg-slate-900/80 border-2 border-amber-500/40 p-6 sm:p-8 rounded-3xl backdrop-blur max-w-3xl mx-auto shadow-2xl">
              <div className="relative group">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 opacity-75 blur group-hover:opacity-100 transition duration-500 animate-pulse" />
                <div className="relative">
                  <TeamBadge
                    shortName={champion.shortName}
                    logoUrl={champion.logoUrl}
                    size="lg"
                    className="h-24 w-24 sm:h-28 sm:w-28 text-2xl font-black ring-4 ring-amber-400 shadow-2xl bg-slate-950"
                  />
                  <span className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg font-bold">
                    👑
                  </span>
                </div>
              </div>

              <div className="text-center sm:text-left space-y-2 flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <Badge className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5">
                    WINNERS 🏆
                  </Badge>
                  {champion.captain && (
                    <span className="text-xs text-amber-200/90 font-medium">
                      Captain: <strong>{champion.captain}</strong>
                    </span>
                  )}
                </div>

                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-amber-300 to-amber-500 drop-shadow-md">
                  {champion.name}
                </h2>

                {finalMatch?.resultText && (
                  <p className="text-sm sm:text-base font-bold text-amber-200/90 bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/30 inline-block">
                    🏆 {finalMatch.resultText}
                  </p>
                )}

                {runnerUp && (
                  <p className="text-xs text-slate-300 font-medium pt-1">
                    🥈 Runner-Up: <strong className="text-slate-100">{runnerUp.name}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                onClick={triggerChampionConfetti}
                className="h-11 px-5 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-xl transition-transform active:scale-95 gap-2"
              >
                <PartyPopper className="h-4 w-4" />
                <span>Celebrate with Confetti! 🎉</span>
              </Button>

              {finalMatch && (
                <Link to={`/matches/${finalMatch.id}`}>
                  <Button
                    variant="outline"
                    className="h-11 px-5 rounded-xl font-bold text-xs sm:text-sm border-amber-400/40 text-amber-300 hover:bg-amber-400/10 shadow gap-2"
                  >
                    <Trophy className="h-4 w-4 text-amber-400" />
                    <span>View Grand Final Scorecard</span>
                  </Button>
                </Link>
              )}

              <Link to={`/teams/${champion.id}`}>
                <Button
                  variant="outline"
                  className="h-11 px-5 rounded-xl font-bold text-xs sm:text-sm border-border text-slate-200 hover:bg-white/5 gap-2"
                >
                  <span>Champions Squad</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Hero Header with Poster Details (if tournament not yet finished, or secondary banner) */}
      {!champion && (
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
                <span className="font-bold text-slate-100">
                  {allDates.length > 0 ? allDates.join(" • ") : "Tournament Dates"}
                </span>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-sm shadow-sm backdrop-blur">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-slate-100">
                  {allTimes.length > 0
                    ? allTimes.length <= 3
                      ? allTimes.join(", ")
                      : `${allTimes[0]} onwards`
                    : "Evening Matches"}
                </span>
              </div>

              <a
                href="https://maps.app.goo.gl/va7W9eD3MYWH2SyCA?g_st=ac"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-emerald-500/30 hover:border-emerald-400 text-sm shadow-sm backdrop-blur transition-all group"
                title="View venue on Google Maps"
              >
                <MapPin className="h-4 w-4 text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                  {allVenues.length > 0 ? allVenues.join(" • ") : "Askari XI, Lahore"} ↗
                </span>
              </a>
            </div>

            {/* Slogan & Share Banner */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <p className="font-extrabold text-xs sm:text-sm tracking-widest uppercase text-emerald-300/90 italic bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                ⚡ PLAY HARD, WIN TOGETHER! ⚡
              </p>
              <Button
                onClick={() => setShareOpen(true)}
                size="sm"
                className="h-8 px-3 rounded-full text-xs font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share on WhatsApp & QR</span>
              </Button>
            </div>
          </div>
        </section>
      )}

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
                    <p className="text-lg font-bold">
                      <PlayerLink playerId={topBatsman.playerId} name={topBatsman.name} />
                    </p>
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
                    <p className="text-lg font-bold">
                      <PlayerLink playerId={topBowler.playerId} name={topBowler.name} />
                    </p>
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

      <ShareTournamentModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        tournament={tournament}
      />
    </div>
  );
}
