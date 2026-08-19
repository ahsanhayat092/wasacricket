import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import { statusBadgeClass, type MatchStatus } from "@/lib/cricket";
import { CalendarDays, MapPin } from "lucide-react";
import type { HydratedMatch } from "@/lib/firestore";

// Re-export so pages that import from MatchCard can still get the type
export type { HydratedMatch };

export function MatchCard({ match }: { match: HydratedMatch }) {
  const to = match.status === "LIVE" ? `/live/${match.id}` : `/matches/${match.id}`;
  return (
    <Link to={to}>
      <Card className="hover:shadow-md hover:border-primary/40 transition-all h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {match.stage === "FINAL" ? "🏆 Final" : `Match ${match.matchNumber}`} ·{" "}
              {match.day}
            </span>
            <Badge variant="outline" className={statusBadgeClass(match.status)}>
              {match.status === "LIVE" && (
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
              {match.status.replace("_", " ")}
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <TeamBadge
                shortName={match.teamA?.shortName ?? "TBD"}
                logoUrl={match.teamA?.logoUrl}
                size="sm"
              />
              <span className="font-semibold truncate">
                {match.teamA?.name ?? "Rank 1"}
              </span>
            </div>
            <span className="text-xs font-bold text-muted-foreground shrink-0">VS</span>
            <div className="flex items-center gap-2 min-w-0 justify-end">
              <span className="font-semibold truncate text-right">
                {match.teamB?.name ?? "Rank 2"}
              </span>
              <TeamBadge
                shortName={match.teamB?.shortName ?? "TBD"}
                logoUrl={match.teamB?.logoUrl}
                size="sm"
              />
            </div>
          </div>

          {match.resultText ? (
            <p className="mt-3 text-sm font-medium text-emerald-500">
              {match.resultText}
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {match.date && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {match.date}
                  {match.time ? ` · ${match.time}` : ""}
                </span>
              )}
              {match.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {match.venue}
                </span>
              )}
              {!match.date && !match.venue && <span>Schedule to be announced</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
