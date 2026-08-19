import { useQuery } from "@tanstack/react-query";
import { getSchedule } from "@/lib/queries";
import { MatchCard, type HydratedMatch } from "@/components/MatchCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Trophy } from "lucide-react";

const DAY_ORDER = ["FRIDAY", "SATURDAY", "SUNDAY"] as const;

const DAY_LABELS: Record<string, string> = {
  FRIDAY: "Day 1 — 26 August (9:00 PM to 1:00 AM)",
  SATURDAY: "Day 2 — 27 August (9:00 PM to 1:00 AM)",
  SUNDAY: "Day 3 — Finals",
};

export default function Schedule() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["schedule"],
    queryFn: getSchedule,
    refetchInterval: 15000,
  });

  if (isLoading || !matches) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Find any matches that don't match standard DAY_ORDER
  const otherMatches = matches.filter(
    (m) => !DAY_ORDER.includes(m.day as (typeof DAY_ORDER)[number]),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
              Match Schedule
            </h1>
            <Badge variant="secondary" className="font-mono font-bold">
              {matches.length} {matches.length === 1 ? "Fixture" : "Fixtures"}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
              26, 27 August
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              9:00 PM to 1:00 AM
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
              Askari XI, Lahore
            </span>
          </div>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed bg-muted/20 space-y-3">
          <Trophy className="h-10 w-10 text-muted-foreground/50 mx-auto" />
          <h3 className="text-lg font-bold">No Fixtures Scheduled Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The match schedule is being prepared. Fixtures with timings and team matchups will appear here once announced.
          </p>
        </div>
      ) : (
        <>
          {DAY_ORDER.map((day) => {
            const dayMatches = matches.filter((m) => m.day === day);
            if (dayMatches.length === 0) return null;
            return (
              <section key={day} className="space-y-4">
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-3.5 py-1.5 rounded-lg inline-block border border-emerald-500/20">
                  {DAY_LABELS[day] ?? day}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dayMatches.map((m) => (
                    <MatchCard key={m.id} match={m as HydratedMatch} />
                  ))}
                </div>
              </section>
            );
          })}

          {otherMatches.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-3.5 py-1.5 rounded-lg inline-block border border-amber-500/20">
                Additional Fixtures
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherMatches.map((m) => (
                  <MatchCard key={m.id} match={m as HydratedMatch} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
