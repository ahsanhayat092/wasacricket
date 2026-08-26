import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getAdminDashboard, getUserTournaments } from "@/lib/queries";
import { useTournament } from "@/context/TournamentContext";
import { useAuth } from "@/hooks/useAuth";
import { seedTournament } from "@/lib/mutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import { triggerChampionConfetti } from "@/lib/confetti";
import { ShareTournamentModal } from "@/components/ShareTournamentModal";
import { Link, useNavigate } from "react-router";
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
  Layers,
  Zap,
  Plus,
  Share2,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tournamentId, tournament, setTournamentId } = useTournament();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const isSuperAdmin = user?.email?.toLowerCase() === "ahsanhayat092@gmail.com";

  const { data: tournaments, isLoading: isLoadingTournaments } = useQuery({
    queryKey: ["user_tournaments", user?.uid, user?.email],
    queryFn: () => getUserTournaments(user?.email, user?.uid),
    enabled: !!user,
  });

  const isAuthorized =
    isSuperAdmin ||
    (!!tournaments && tournaments.some((t) => t.id === tournamentId));

  // Auto-switch to user's first tournament if current tournamentId is not theirs
  useEffect(() => {
    if (!isSuperAdmin && tournaments && tournaments.length > 0) {
      const hasCurrent = tournaments.some((t) => t.id === tournamentId);
      if (!hasCurrent) {
        setTournamentId(tournaments[0].id);
      }
    }
  }, [isSuperAdmin, tournaments, tournamentId, setTournamentId]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["adminDashboard", tournamentId],
    queryFn: () => getAdminDashboard(tournamentId),
    refetchInterval: 20000,
    enabled: !!tournamentId && isAuthorized,
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

  // 1. While tournaments are resolving for non-super-admin, show skeleton (never flash unauthorized data)
  if (!isSuperAdmin && isLoadingTournaments) {
    return (
      <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  // 2. If user owns 0 tournaments, show welcoming launchpad card
  if (!isSuperAdmin && !isLoadingTournaments && (!tournaments || tournaments.length === 0)) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6 text-center py-16">
        <Card className="p-10 text-center space-y-6 border-dashed border-2 bg-muted/10 rounded-3xl shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Create Your First Cricket Tournament!</h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              You are logged in as an Organizer. Launch your corporate cup, tape-ball league, or club championship with our 5-step tournament wizard.
            </p>
          </div>
          <Link to="/admin/tournaments/new" className="inline-block">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 rounded-xl shadow-lg shadow-emerald-600/20 px-8 h-12">
              <Plus className="h-5 w-5" /> Launch 5-Step Tournament Wizard
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // 3. If currently switching or unauthorized, show skeleton
  if (!isAuthorized || isLoading || !data) {
    return (
      <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const { champion, finalMatch } = data;
  const isZeroTeams = data.totalTeams === 0;

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
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header & Workspace Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 font-bold">
              <Trophy className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                Organizer Workspace
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active Tournament: <strong className="text-foreground">{tournament?.name || "WASA Premier League 2026"}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions & Workspace Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {tournaments && tournaments.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border">
              <span className="text-xs font-semibold text-muted-foreground px-2 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-emerald-500" /> Event:
              </span>
              <select
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="h-8 px-2.5 text-xs font-bold rounded-lg border-0 bg-card text-foreground cursor-pointer"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShareModalOpen(true)}
            className="h-9 text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 rounded-xl"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share / QR</span>
          </Button>

          <Link to="/admin/tournaments/new">
            <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 rounded-xl shadow-sm">
              <Plus className="h-3.5 w-3.5" /> Create Tournament
            </Button>
          </Link>
        </div>
      </div>

      {/* Empty State Onboarding Card (If no teams in current tournament) */}
      {isZeroTeams && (
        <Card className="p-8 sm:p-10 text-center space-y-5 border-2 border-dashed border-emerald-500/40 bg-emerald-500/[0.02] rounded-3xl">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-inner">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-xl font-black tracking-tight">Welcome to Your Tournament Workspace!</h2>
            <p className="text-xs text-muted-foreground">
              You haven't added teams or fixtures to this tournament yet. Use our 5-step wizard to auto-generate fixtures or seed sample data.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/admin/tournaments/new">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-6 rounded-xl gap-2 shadow-md">
                <Trophy className="h-4 w-4" /> Launch 5-Step Tournament Wizard
              </Button>
            </Link>
            <Button
              variant="outline"
              disabled={seed.isPending}
              onClick={() => seed.mutate()}
              className="text-xs font-bold h-10 px-4 rounded-xl gap-2"
            >
              <Database className="h-4 w-4" /> Seed Sample Teams & Matches
            </Button>
          </div>
        </Card>
      )}

      {/* Tournament Champions Spotlight (When Final is completed) */}
      {champion && (
        <Card className="border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 shadow-xl overflow-hidden rounded-2xl">
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

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/admin/matches" className="group">
          <Card className="p-4 border-2 hover:border-emerald-500 transition-all bg-card/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-105 transition-transform">
                  <Zap className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Matches & Live Scoring</h3>
                  <p className="text-[11px] text-muted-foreground">Toss, ball-by-ball scoring & results</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Card>
        </Link>

        <Link to="/admin/teams" className="group">
          <Card className="p-4 border-2 hover:border-emerald-500 transition-all bg-card/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-105 transition-transform">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Teams & Rosters</h3>
                  <p className="text-[11px] text-muted-foreground">Player squads, captains & roles</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Card>
        </Link>

        <Link to={`/t/${tournament?.slug || tournament?.id || "wasa-2026"}`} target="_blank" className="group">
          <Card className="p-4 border-2 hover:border-emerald-500 transition-all bg-card/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform">
                  <ExternalLink className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Public Fan Portal</h3>
                  <p className="text-[11px] text-muted-foreground">View live web scorecard & standings</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Standings Top 2 Leader */}
      <div className="grid gap-4 md:grid-cols-2">
        {[data.rank1, data.rank2].map((r, i) => (
          <Card key={i} className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Current Rank {i + 1} {i === 0 ? "🥇" : "🥈"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              {r?.team ? (
                <>
                  <TeamBadge shortName={r.team.shortName} logoUrl={r.team.logoUrl} />
                  <div>
                    <p className="font-bold text-sm">{r.team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.points} pts · NRR {r.nrr >= 0 ? "+" : ""}
                      {r.nrr.toFixed(3)}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">—</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Share & QR Code Modal */}
      <ShareTournamentModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        tournament={tournament}
      />
    </div>
  );
}
