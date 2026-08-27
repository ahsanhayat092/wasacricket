import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getSchedule, getTournaments } from "@/lib/queries";
import { useTournament } from "@/context/TournamentContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  KeyRound,
  Zap,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Clock,
  MapPin,
  Trophy,
  Shield,
  Activity,
  Layers,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { statusBadgeClass, formatMatchDay, type MatchStatus } from "@/lib/cricket";

export default function ScorerDashboard() {
  const navigate = useNavigate();
  const { tournamentId, tournament, setTournamentId } = useTournament();
  const [tab, setTab] = useState<"live" | "upcoming" | "completed">("live");

  const { user, isScorer, isAdmin, isLoading: isAuthLoading } = useAuth();

  const { data: tournaments } = useQuery({
    queryKey: ["tournaments"],
    queryFn: getTournaments,
    enabled: isAdmin,
  });

  // Get list of tournament IDs unlocked via PIN in this session
  const pinUnlockedTourneys: string[] = useMemo(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem("scorer_auth_tournaments");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  // Fetch tournaments this user/session is authorized to score
  const { data: scorerTourneys, isLoading: isScorerTourneysLoading } = useQuery({
    queryKey: ["user_scorer_tournaments", user?.email, user?.uid, pinUnlockedTourneys],
    queryFn: () => getUserScorerTournaments(user?.email, user?.uid, pinUnlockedTourneys),
    enabled: !isAdmin,
  });

  // Allowed tournaments for this scorer:
  // - If user is Platform Admin: all tournaments
  // - Otherwise: ONLY tournaments assigned in tournamentMembers or unlocked via PIN
  const allowedTournaments = useMemo(() => {
    if (isAdmin) return tournaments || [];
    return scorerTourneys || [];
  }, [isAdmin, tournaments, scorerTourneys]);

  // Compute effective tournament ID immediately so query never waits on state sync
  const effectiveTournamentId = useMemo(() => {
    if (isAdmin) return tournamentId;
    if (allowedTournaments.length > 0) {
      const match = allowedTournaments.find((t) => t.id === tournamentId);
      return match ? match.id : allowedTournaments[0].id;
    }
    return tournamentId;
  }, [isAdmin, tournamentId, allowedTournaments]);

  const hasPinSession = pinUnlockedTourneys.length > 0;
  const isAuthorizedForActive = Boolean(
    isAdmin || (effectiveTournamentId && allowedTournaments.some((t) => t.id === effectiveTournamentId))
  );

  // Strict route authorization guard: require active PIN session or logged in Scorer/Admin
  useEffect(() => {
    if (!isAuthLoading && !isScorerTourneysLoading) {
      if (!isAdmin && !hasPinSession && !user) {
        navigate("/scorer/login", { replace: true });
        return;
      }
      if (!isAdmin && allowedTournaments.length > 0 && tournamentId !== effectiveTournamentId) {
        setTournamentId(effectiveTournamentId);
      }
    }
  }, [
    isAuthLoading,
    isScorerTourneysLoading,
    isAdmin,
    hasPinSession,
    user,
    allowedTournaments,
    tournamentId,
    effectiveTournamentId,
    navigate,
    setTournamentId,
  ]);

  const { data: matches, isLoading } = useQuery({
    queryKey: ["schedule", effectiveTournamentId],
    queryFn: () => getSchedule(effectiveTournamentId),
    refetchInterval: 5000,
    enabled: Boolean(effectiveTournamentId),
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        <p className="text-sm font-semibold text-muted-foreground">Verifying Scorer Authorization...</p>
      </div>
    );
  }

  if (!isAdmin && !hasPinSession && !user) {
    return null;
  }

  const liveMatches = matches?.filter((m) => m.status === "LIVE") ?? [];
  const upcomingMatches = matches?.filter((m) => m.status === "UPCOMING") ?? [];
  const completedMatches = matches?.filter((m) => m.status === "COMPLETED" || m.status === "NO_RESULT" || m.status === "ABANDONED") ?? [];

  const currentMatches =
    tab === "live" ? liveMatches : tab === "upcoming" ? upcomingMatches : completedMatches;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 font-bold">
              <KeyRound className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                Scorer Match Center
                <Badge className="bg-amber-500 text-white font-bold text-[10px]">
                  {hasPinSession ? "PIN UNLOCKED" : "OFFICIAL SCORER"}
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active Tournament: <strong className="text-foreground">{tournament?.name || "WASA Premier League 2026"}</strong>
                {user?.email && <span className="ml-2">· Signed in as <span className="font-mono text-foreground">{user.email}</span></span>}
              </p>
            </div>
          </div>
        </div>

        {/* Tournament Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {allowedTournaments && allowedTournaments.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border">
              <span className="text-xs font-semibold text-muted-foreground px-2 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-emerald-500" /> Event:
              </span>
              <select
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="h-8 px-2.5 text-xs font-bold rounded-lg border-0 bg-card text-foreground cursor-pointer"
              >
                {allowedTournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Link to="/scorer/login">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs font-bold gap-1.5 rounded-xl border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
            >
              <KeyRound className="h-3.5 w-3.5" /> Unlock Another Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          onClick={() => setTab("live")}
          className={`cursor-pointer transition-all border-2 ${
            tab === "live" ? "border-emerald-500 bg-emerald-500/[0.04] shadow-md ring-1 ring-emerald-500/30" : "hover:border-border"
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold flex items-center justify-between">
              <span>LIVE MATCHES</span>
              {liveMatches.length > 0 && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-500">
              {liveMatches.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">In progress with active scoring</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setTab("upcoming")}
          className={`cursor-pointer transition-all border-2 ${
            tab === "upcoming" ? "border-amber-500 bg-amber-500/[0.04] shadow-md ring-1 ring-amber-500/30" : "hover:border-border"
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold">UPCOMING MATCHES</CardDescription>
            <CardTitle className="text-3xl font-black text-amber-500">
              {upcomingMatches.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Ready for toss & playing lineup</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setTab("completed")}
          className={`cursor-pointer transition-all border-2 ${
            tab === "completed" ? "border-sky-500 bg-sky-500/[0.04] shadow-md ring-1 ring-sky-500/30" : "hover:border-border"
          }`}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold">COMPLETED MATCHES</CardDescription>
            <CardTitle className="text-3xl font-black text-sky-500">
              {completedMatches.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-muted-foreground">Finalized results & records</p>
          </CardContent>
        </Card>
      </div>

      {/* Matches List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black capitalize flex items-center gap-2">
            {tab === "live" ? "🔥 In-Progress Matches" : tab === "upcoming" ? "⏳ Upcoming Fixtures" : "✅ Finalized Matches"}
          </h2>
          <span className="text-xs text-muted-foreground font-semibold">
            Showing {currentMatches.length} matches
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            Loading assigned matches...
          </div>
        ) : currentMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentMatches.map((m) => {
              const isLive = m.status === "LIVE";
              const isUpcoming = m.status === "UPCOMING";

              return (
                <Card
                  key={m.id}
                  className={`p-4 flex flex-col justify-between transition-all border-2 ${
                    isLive ? "border-emerald-500 bg-emerald-500/[0.03] shadow-md" : "border-border/60 hover:border-border"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">
                        {m.stage === "FINAL" ? "🏆 Grand Final" : m.stage === "PLAYOFF" ? "⚔️ Playoff Match" : `Match #${m.matchNumber}`}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(m.status as MatchStatus)}`}>
                        {m.status}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-black text-base text-foreground">
                        {m.teamA?.name ?? "Team A"} vs {m.teamB?.name ?? "Team B"}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatMatchDay(m.day, m.date)} {m.time ? `· ${m.time}` : ""} · {m.venue ?? "Askari XI"}
                      </p>
                    </div>

                    {m.resultText && (
                      <p className="text-xs font-bold text-emerald-500 pt-1">
                        🏆 {m.resultText}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {m.oversPerSide ?? 4} Overs Match
                    </span>
                    <Link to={`/admin/matches/${m.id}`}>
                      <Button
                        size="sm"
                        className={`text-xs font-bold gap-1.5 h-9 px-4 rounded-xl shadow-sm ${
                          isLive
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : isUpcoming
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : ""
                        }`}
                        variant={isLive || isUpcoming ? "default" : "outline"}
                      >
                        {isLive ? "Open Live Scoring" : isUpcoming ? "Start Match & Toss" : "Review Scorecard"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center space-y-3 border-dashed">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-base">No Matches in this View</h3>
            <p className="text-xs text-muted-foreground">
              There are no {tab} matches for the active tournament.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
