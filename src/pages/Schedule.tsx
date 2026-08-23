import { useQuery } from "@tanstack/react-query";
import { getSchedule } from "@/lib/queries";
import { MatchCard, type HydratedMatch } from "@/components/MatchCard";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMatchDay } from "@/lib/cricket";
import { downloadSchedulePDF } from "@/lib/pdf-export";
import { toast } from "sonner";
import { Calendar, MapPin, Clock, Trophy, FileDown, Loader2 } from "lucide-react";

export default function Schedule() {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
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

  // Group matches dynamically by date or day
  const groupMap = new Map<string, HydratedMatch[]>();
  for (const m of matches) {
    const key = (m.date && m.date.trim()) || m.day || "Scheduled";
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(m);
  }

  // Derive unique dates, venues, and time range for the tournament header
  const allDates = Array.from(
    new Set(matches.map((m) => m.date?.trim()).filter(Boolean)),
  );
  const allVenues = Array.from(
    new Set(matches.map((m) => m.venue?.trim()).filter(Boolean)),
  );
  const allTimes = Array.from(
    new Set(matches.map((m) => m.time?.trim()).filter(Boolean)),
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
            {allDates.length > 0 && (
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                {allDates.join(" • ")}
              </span>
            )}
            {allTimes.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                {allTimes.length <= 3 ? allTimes.join(", ") : `${allTimes[0]} onwards`}
              </span>
            )}
            {allVenues.length > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                {allVenues.join(" • ")}
              </span>
            )}
          </div>
        </div>

        {matches.length > 0 && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                setIsDownloadingPdf(true);
                await downloadSchedulePDF(matches as HydratedMatch[]);
                toast.success("Schedule PDF downloaded successfully!");
              } catch (err) {
                console.error("PDF Download error:", err);
                toast.error("Failed to generate Schedule PDF.");
              } finally {
                setIsDownloadingPdf(false);
              }
            }}
            disabled={isDownloadingPdf}
            className="gap-2 font-bold text-xs sm:text-sm border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 rounded-xl shadow-sm h-9 px-4"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <FileDown className="h-4 w-4 text-emerald-400" />
            )}
            <span>Download Schedule PDF</span>
          </Button>
        )}
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
        Array.from(groupMap.entries()).map(([groupKey, groupMatches], groupIndex) => {
          const first = groupMatches[0];
          const hasFinal = groupMatches.some((m) => m.stage === "FINAL");
          const groupDayText = formatMatchDay(first.day, first.date);
          const times = Array.from(new Set(groupMatches.map((m) => m.time?.trim()).filter(Boolean)));
          const timeRangeText = times.length > 1 ? `${times[0]} to ${times[times.length - 1]}` : times[0] ?? "";

          return (
            <section key={groupKey} className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 border border-emerald-500/20">
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  {hasFinal ? "🏆 " : `Day ${groupIndex + 1} — `}
                  {groupDayText}
                  {timeRangeText && (
                    <span className="text-xs text-emerald-300 font-normal ml-1">
                      ({timeRangeText})
                    </span>
                  )}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupMatches.map((m) => (
                  <MatchCard key={m.id} match={m as HydratedMatch} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
