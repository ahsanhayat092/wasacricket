import React, { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getSchedule } from "@/lib/queries";
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
} from "lucide-react";
import { statusBadgeClass, formatMatchDay, type MatchStatus } from "@/lib/cricket";

export default function PublicLiveScores() {
  const [filter, setFilter] = useState<"ALL" | "LIVE" | "UPCOMING" | "COMPLETED">("ALL");

  const { data: matches, isLoading } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => getSchedule(),
    refetchInterval: 5000, // auto-refresh live scores
  });

  const filteredMatches = matches?.filter((m) => {
    if (filter === "ALL") return true;
    return m.status === filter;
  });

  const liveCount = matches?.filter((m) => m.status === "LIVE").length ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Activity className="h-6 w-6 animate-pulse" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                Live Scores & Match Center
                {liveCount > 0 && (
                  <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-bold animate-pulse text-[11px]">
                    {liveCount} LIVE
                  </Badge>
                )}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time ball-by-ball updates, live scorecards, and tournament match results.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-2xl border">
          {[
            { key: "ALL", label: "All Matches" },
            { key: "LIVE", label: `Live (${liveCount})` },
            { key: "UPCOMING", label: "Upcoming" },
            { key: "COMPLETED", label: "Completed" },
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
          Loading match scores...
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
        <Card className="p-12 text-center space-y-4 border-dashed">
          <Activity className="h-10 w-10 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold">No Matches in this Category</h3>
            <p className="text-xs text-muted-foreground">
              There are currently no matches with status "{filter}".
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFilter("ALL")}>
            View All Matches
          </Button>
        </Card>
      )}
    </div>
  );
}
