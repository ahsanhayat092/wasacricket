import React, { useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournaments } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Search,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Filter,
  Users,
} from "lucide-react";
import type { TournamentFormatType } from "@/lib/firestore";

export default function PublicTournamentsList() {
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<string>("ALL");

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

    return matchesSearch && matchesFormat;
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
          Discover active championships, follow live ball-by-ball matches, and explore full points tables and statistics.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border bg-card/60 backdrop-blur">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tournament name or venue..."
            className="pl-9 h-10 text-xs rounded-xl"
          />
        </div>

        {/* Format Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
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
              variant={formatFilter === f.key ? "default" : "outline"}
              className={`text-xs h-8 rounded-xl font-semibold ${
                formatFilter === f.key ? "bg-emerald-600 text-white" : ""
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

            return (
              <Card
                key={t.id}
                className="flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-lg transition-all group overflow-hidden"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 font-black text-sm flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
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
                        t.status === "COMPLETED"
                          ? "text-emerald-500 border-emerald-500/30"
                          : "text-amber-500 border-amber-500/30"
                      }`}
                    >
                      {t.status || "COMPLETED"}
                    </Badge>
                  </div>
                </CardHeader>

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
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 h-8 rounded-xl shadow-sm">
                        View Tournament <ArrowRight className="h-3 w-3" />
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
              No tournaments match your search filter "{search}". Try searching for something else.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setFormatFilter("ALL");
            }}
          >
            Clear Filters
          </Button>
        </Card>
      )}
    </div>
  );
}
