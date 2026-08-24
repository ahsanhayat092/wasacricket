import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getAdminDashboard } from "@/lib/queries";
import { seedTournament } from "@/lib/mutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import { triggerChampionConfetti } from "@/lib/confetti";
import { Link } from "react-router";
import {
  CalendarDays,
  CheckCircle2,
  Database,
  Radio,
  Target,
  Trophy,
  Users,
  Crown,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: getAdminDashboard,
    refetchInterval: 20000,
  });

  const seed = useMutation({
    mutationFn: () => seedTournament(),
    onSuccess: (r) => {
      if (r.seeded) {
        toast.success("Tournament seeded with 6 teams and fixtures!");
        queryClient.invalidateQueries();
      } else {
        toast.info("Tournament already exists — seed skipped.");
      }
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const { champion, finalMatch } = data;

  const cards = [
    { label: "Total Teams", value: data.totalTeams, icon: Trophy },
    { label: "Total Players", value: data.totalPlayers, icon: Users },
    { label: "Total Matches", value: data.totalMatches, icon: CalendarDays },
    { label: "Completed", value: data.completedMatches, icon: CheckCircle2 },
    { label: "Upcoming", value: data.upcomingMatches, icon: CalendarDays },
    { label: "Live Now", value: data.liveMatches, icon: Radio },
    { label: "Total Runs", value: data.totalRuns, icon: Target },
    { label: "Total Wickets", value: data.totalWickets, icon: Target },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Tournament Champions Spotlight (When Final is completed) */}
      {champion && (
        <Card className="border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 shadow-xl overflow-hidden">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="relative">
                <TeamBadge
                  shortName={champion.shortName}
                  logoUrl={champion.logoUrl}
                  size="lg"
                  className="h-16 w-16 text-xl ring-4 ring-amber-400 bg-slate-950"
                />
                <span className="absolute -bottom-1 -right-1 text-base">👑</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5">
                    🏆 TOURNAMENT CHAMPIONS
                  </Badge>
                  {champion.captain && (
                    <span className="text-xs text-amber-200/80 font-semibold">
                      Captain: {champion.captain}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase text-amber-300">
                  {champion.name}
                </h2>
                {finalMatch?.resultText && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-200">
                    {finalMatch.resultText}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                onClick={triggerChampionConfetti}
                className="font-black text-xs bg-amber-500 text-slate-950 hover:bg-amber-400 gap-1.5 shadow"
              >
                <PartyPopper className="h-4 w-4" />
                <span>Celebrate 🎉</span>
              </Button>
              {finalMatch && (
                <Link to={`/admin/matches/${finalMatch.id}`}>
                  <Button variant="outline" className="text-xs font-bold border-amber-500/40 text-amber-300">
                    Grand Final Control
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {data.totalTeams === 0 && (
          <Button
            variant="outline"
            disabled={seed.isPending}
            onClick={() => seed.mutate()}
          >
            <Database className="h-4 w-4 mr-2" /> Seed Tournament Data
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-extrabold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[data.rank1, data.rank2].map((r, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Rank {i + 1} {i === 0 ? "🥇" : "🥈"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              {r?.team ? (
                <>
                  <TeamBadge shortName={r.team.shortName} logoUrl={r.team.logoUrl} />
                  <div>
                    <p className="font-bold">{r.team.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.points} pts · NRR {r.nrr >= 0 ? "+" : ""}
                      {r.nrr.toFixed(3)}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
