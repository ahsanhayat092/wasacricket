import React, { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournaments } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Search,
  MapPin,
  ArrowRight,
} from "lucide-react";

export default function PublicTournamentsList() {
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: getTournaments,
  });

  const filteredTournaments = tournaments?.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.venueName && t.venueName.toLowerCase().includes(search.toLowerCase())) ||
      (t.shortName && t.shortName.toLowerCase().includes(search.toLowerCase()));

    const matchesFormat =
      formatFilter === "ALL" || (t.formatType || "TAPE_BALL_INDOOR") === formatFilter;

    const isTourneyCompleted = (t.status || "").toUpperCase() === "COMPLETED";
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "COMPLETED" && isTourneyCompleted) ||
      (statusFilter === "ACTIVE" && !isTourneyCompleted);

    return matchesSearch && matchesFormat && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 font-bold uppercase tracking-wider text-[10px]">
          Public Directory
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Cricket Tournaments</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Discover active championships, follow live ball-by-ball matches, and explore full points tables, statistical leaderboards, and completed tournament archives.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-3 p-4 rounded-2xl border bg-card/60 backdrop-blur">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tournament name or venue..."
              className="pl-9 h-10 text-xs rounded-xl"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border self-start sm:self-auto">
            <Button
              size="sm"
              variant={statusFilter === "ALL" ? "default" : "ghost"}
              className={`text-xs h-8 rounded-lg font-bold ${
                statusFilter === "ALL" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => setStatusFilter("ALL")}
            >
              All Tournaments
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "ACTIVE" ? "default" : "ghost"}
              className={`text-xs h-8 rounded-lg font-bold ${
                statusFilter === "ACTIVE" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Ongoing / Upcoming
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "COMPLETED" ? "default" : "ghost"}
              className={`text-xs h-8 rounded-lg font-bold ${
                statusFilter === "COMPLETED" ? "bg-amber-600 text-white shadow-sm" : "text-muted-foreground"
              }`}
              onClick={() => setStatusFilter("COMPLETED")}
            >
              🏆 Completed
            </Button>
          </div>
        </div>

        {/* Format Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-border/40">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
            Format:
          </span>
          {[
            { key: "ALL", label: "All Formats" },
            { key: "TAPE_BALL_INDOOR", label: "Tape-Ball / Indoor" },
            { key: "T10", label: "T10" },
            { key: "T20", label: "T20" },
            { key: "ODI", label: "ODI" },
          ].map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={formatFilter === f.key ? "secondary" : "ghost"}
              className={`text-xs h-7 rounded-lg font-semibold px-2.5 ${
                formatFilter === f.key ? "bg-secondary text-secondary-foreground font-bold" : "text-muted-foreground"
              }`}
              onClick={() => setFormatFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tournaments Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Loading tournaments...
        </div>
      ) : filteredTournaments && filteredTournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => {
            const publicUrl = `/t/${t.slug || t.id}`;
            const statusUpper = (t.status || "").toUpperCase();
            const isCompleted = statusUpper === "COMPLETED";
            const isUpcoming = statusUpper === "UPCOMING";

            return (
              <Card
                key={t.id}
                className={`flex flex-col justify-between hover:shadow-xl transition-all group overflow-hidden border-2 ${
                  isCompleted
                    ? "border-amber-500/30 hover:border-amber-500/60 bg-gradient-to-b from-amber-500/[0.02] to-card"
                    : "hover:border-emerald-500/50"
                }`}
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform ${
                        isCompleted
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      }`}
                    >
                      {t.shortName || "CRIC"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-black truncate group-hover:text-emerald-500 transition-colors">
                        {t.name}
                      </CardTitle>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-emerald-500" /> {t.venueName || "Lahore, Pakistan"}
                      </p>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {t.oversPerSide || 4} Overs
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {(t.formatType || "TAPE_BALL_INDOOR").replace(/_/g, " ")}
                    </Badge>

                    {/* Status Badge */}
                    {isCompleted ? (
                      <Badge className="text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/35 gap-1 px-2 py-0.5 shadow-sm">
                        <Trophy className="h-3 w-3 text-amber-400" /> Completed
                      </Badge>
                    ) : isUpcoming ? (
                      <Badge className="text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5">
                        Upcoming
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 gap-1 px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live / Ongoing
                      </Badge>
                    )}

                    {/* Total & completed matches badge */}
                    {t.totalMatches !== undefined && t.totalMatches > 0 && (
                      <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/70">
                        {t.completedMatches !== undefined && t.completedMatches >= t.totalMatches
                          ? `All ${t.totalMatches} Matches Played`
                          : `${t.completedMatches ?? 0}/${t.totalMatches} Matches`}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {/* Champion Spotlight Banner if completed */}
                {isCompleted && (t.championTeamName || t.championTeamId) && (
                  <div className="mx-6 mb-2 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-1 rounded-lg bg-amber-500/25 text-amber-400 shadow-sm shrink-0">
                        <Trophy className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                          Grand Final Champion
                        </p>
                        <p className="text-xs font-black text-foreground truncate">
                          {t.championTeamName || "Champion Crowned"}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-500 text-black font-black text-[10px] px-2 py-0.5 shadow-sm shrink-0">
                      1st Place
                    </Badge>
                  </div>
                )}

                <CardContent className="space-y-4 pt-2 border-t">
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {t.description || "Official match schedules, ball-by-ball scorecards, tournament standings, and player awards."}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t gap-2">
                    <Link
                      to="/admin"
                      onClick={() => {
                        localStorage.setItem("wasa_active_tournament_id", t.id);
                      }}
                    >
                      <span className="text-[11px] text-muted-foreground hover:text-emerald-500 font-semibold cursor-pointer">
                        Organizer Access →
                      </span>
                    </Link>
                    <Link to={publicUrl}>
                      <Button
                        size="sm"
                        className={`text-xs font-bold gap-1.5 h-8 rounded-xl shadow-sm text-white ${
                          isCompleted
                            ? "bg-amber-600 hover:bg-amber-500"
                            : "bg-emerald-600 hover:bg-emerald-500"
                        }`}
                      >
                        {isCompleted ? "View Results & Awards" : "View Tournament"}{" "}
                        <ArrowRight className="h-3 w-3" />
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
          <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold">No Tournaments Found</h3>
            <p className="text-xs text-muted-foreground">
              No tournaments match your search or filter criteria. Try clearing filters.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setFormatFilter("ALL");
              setStatusFilter("ALL");
            }}
          >
            Clear Filters
          </Button>
        </Card>
      )}
    </div>
  );
}
