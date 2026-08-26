import React, { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getSchedule } from "@/lib/queries";
import { useTournament } from "@/context/TournamentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Zap,
  Calendar,
  Award,
  ArrowRight,
  Clock,
  MapPin,
  Trophy,
  Filter,
  Radio,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { statusBadgeClass, formatMatchDay, type MatchStatus } from "@/lib/cricket";

export default function PublicLiveScores() {
  const { tournamentId } = useTournament();
  const [filter, setFilter] = useState<"LIVE" | "UPCOMING" | "ALL">("LIVE");

  const { data: matches, isLoading } = useQuery({
    queryKey: ["schedule", tournamentId],
    queryFn: () => getSchedule(tournamentId),
    refetchInterval: 5000, // auto-refresh live scores
  });

  const liveMatches = matches?.filter((m) => m.status === "LIVE") ?? [];
  const upcomingMatches = matches?.filter((m) => m.status === "SCHEDULED" || m.status === "UPCOMING") ?? [];

  const filteredMatches = matches?.filter((m) => {
    if (filter === "LIVE") return m.status === "LIVE";
    if (filter === "UPCOMING") return m.status === "SCHEDULED" || m.status === "UPCOMING";
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Radio className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                Live Scores & In-Play
                {liveMatches.length > 0 && (
                  <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-bold animate-pulse text-[11px]">
                    {liveMatches.length} LIVE NOW
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time ball-by-ball scoring, wagon wheels, and live match commentary.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl border">
          {[
            { key: "LIVE", label: `Live Now (${liveMatches.length})` },
            { key: "UPCOMING", label: `Upcoming (${upcomingMatches.length})` },
            { key: "ALL", label: "All Matches" },
          ].map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={filter === tab.key ? "default" : "ghost"}
              className={`text-xs h-8 rounded-xl font-bold ${
                filter === tab.key ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => setFilter(tab.key as any)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Matches Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Loading live match scores...
        </div>
      ) : filteredMatches && filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((m) => {
            const isLive = m.status === "LIVE";
            const inn1 = m.innings?.find((i) => i.inningsNumber === 1);
            const inn2 = m.innings?.find((i) => i.inningsNumber === 2);

            return (
              <Card
                key={m.id}
                className={`relative overflow-hidden transition-all flex flex-col justify-between border-2 ${
                  isLive
                    ? "border-emerald-500 bg-emerald-500/[0.04] shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                    : "border-border/60 hover:border-border hover:shadow-md"
                }`}
              >
                {isLive && (
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1.5 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-white" /> LIVE
                  </div>
                )}

                <CardHeader className="pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">
                      {m.stage === "FINAL" ? "🏆 Grand Final" : m.stage === "PLAYOFF" ? "⚔️ Playoff Match" : `Match #${m.matchNumber}`}
                    </span>
                    {!isLive && (
                      <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(m.status as MatchStatus)}`}>
                        {m.status}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    {/* Team A Score Line */}
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-foreground truncate">
                        {m.teamA?.name ?? "Team A"}
                      </span>
                      {inn1 && (
                        <span className="font-mono font-black text-sm text-foreground">
                          {inn1.runs}/{inn1.wickets} <span className="text-[10px] text-muted-foreground font-normal">({inn1.overs} ov)</span>
                        </span>
                      )}
                    </div>

                    {/* Team B Score Line */}
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-foreground truncate">
                        {m.teamB?.name ?? "Team B"}
                      </span>
                      {inn2 && (
                        <span className="font-mono font-black text-sm text-foreground">
                          {inn2.runs}/{inn2.wickets} <span className="text-[10px] text-muted-foreground font-normal">({inn2.overs} ov)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-2 border-t">
                  {/* Result or Match Info */}
                  <div className="text-xs">
                    {m.resultText ? (
                      <p className="font-extrabold text-emerald-500 truncate flex items-center gap-1.5">
                        <Award className="h-4 w-4 shrink-0" /> {m.resultText}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatMatchDay(m.day, m.date)} {m.time ? `· ${m.time}` : ""} · {m.venue ?? "Askari XI"}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t">
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {m.oversPerSide ?? 4} Overs / Side
                    </span>
                    <Link to={`/live/${m.id}`}>
                      <Button
                        size="sm"
                        className={`text-xs font-bold gap-1.5 h-8 rounded-xl shadow-sm ${
                          isLive ? "bg-emerald-600 hover:bg-emerald-500 text-white" : ""
                        }`}
                        variant={isLive ? "default" : "outline"}
                      >
                        {isLive ? "Watch Live" : "View Scorecard"} <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center space-y-6 border-dashed border-2 bg-muted/10 rounded-3xl max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <Radio className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">No Matches Currently Live</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              There are no matches in-play at the moment. Check back during scheduled match times, or browse upcoming fixtures and recent results below.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/schedule">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 rounded-xl">
                <CalendarDays className="h-4 w-4" /> View Schedule
              </Button>
            </Link>
            <Link to="/results">
              <Button size="sm" variant="outline" className="font-bold gap-1.5 rounded-xl">
                <CheckCircle2 className="h-4 w-4" /> View Completed Results
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
