import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getMatchWorkspace } from "@/lib/queries";
import {
  startMatch as fbStartMatch,
  completeMatch as fbCompleteMatch,
  reopenMatch as fbReopenMatch,
  resetMatch as fbResetMatch,
  saveInnings as fbSaveInnings,
  updateMatchLineups as fbUpdateMatchLineups,
} from "@/lib/mutations";
import { useParams, Link } from "react-router";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamBadge } from "@/components/TeamBadge";
import { RecentBalls } from "@/components/RecentBalls";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  statusBadgeClass,
  oversToBalls,
  ballsToOversText,
  formatMatchDay,
  getInningsFallOfWickets,
  getInningsPartnerships,
  type MatchStatus,
} from "@/lib/cricket";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  RotateCcw,
  Zap,
  Shield,
  ArrowRightLeft,
  CheckCircle2,
  Flame,
  Award,
  Users,
} from "lucide-react";
import type {
  Match,
  Team,
  Player,
  Innings,
  BattingScore,
  BowlingScore,
  FallOfWicket,
  Partnership,
} from "@/lib/firestore";

type WorkspaceData = {
  match: Match;
  teams: Team[];
  players: Player[];
  innings: (Innings & { batting: BattingScore[]; bowling: BowlingScore[] })[];
};

export default function AdminMatchControl() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["matchWorkspace", id],
    queryFn: () => getMatchWorkspace(id!),
    enabled: !!id,
    refetchInterval: 10000,
  });

  const [activeInningsTab, setActiveInningsTab] = useState<string>("1");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["matchWorkspace", id] });
    queryClient.invalidateQueries({ queryKey: ["schedule"] });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
    queryClient.invalidateQueries({ queryKey: ["statistics"] });
  };

  const startMatch = useMutation({
    mutationFn: (args: { tossWinnerId: string; tossDecision: "BAT" | "BOWL" }) =>
      fbStartMatch({ matchId: id!, ...args }),
    onSuccess: () => {
      toast.success("Match started — LIVE scoring active");
      refetch();
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const completeMatch = useMutation({
    mutationFn: (args: { playerOfMatchId?: string }) =>
      fbCompleteMatch({ matchId: id!, ...args }),
    onSuccess: (r) => {
      toast.success(`Match completed: ${r.resultText}`);
      refetch();
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const reopen = useMutation({
    mutationFn: () => fbReopenMatch(id!),
    onSuccess: () => {
      toast.success("Match reopened for scoring corrections");
      refetch();
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetMatch = useMutation({
    mutationFn: () => fbResetMatch(id!),
    onSuccess: () => {
      toast.success("Match completely reset! All scorecards cleared and match is now UPCOMING.");
      refetch();
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Sync tab when data loads or updates
  const inn1 = data?.innings?.find((i) => i.inningsNumber === 1);
  const inn2 = data?.innings?.find((i) => i.inningsNumber === 2);

  useEffect(() => {
    if (inn2 && inn1?.completed && activeInningsTab === "1") {
      setActiveInningsTab("2");
    }
  }, [inn2, inn1?.completed, activeInningsTab]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <div className="p-6 rounded-2xl border bg-card shadow-sm space-y-3">
          <p className="text-lg font-bold text-destructive">Match Not Found</p>
          <p className="text-xs text-muted-foreground">The fixture with ID "{id}" could not be loaded or was deleted.</p>
          <Link to="/admin/matches">
            <Button size="sm" className="mt-2">Back to Matches</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { match, teams = [], players = [], innings = [] } = data;
  const teamA = teams.find((t) => t.id === match.teamAId) ?? null;
  const teamB = teams.find((t) => t.id === match.teamBId) ?? null;
  const canEnterScores = match.status === "LIVE";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/matches">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                {match.stage === "FINAL" ? "🏆 Final" : `Match ${match.matchNumber}`}:{" "}
                {teamA?.name ?? "Rank 1"} vs {teamB?.name ?? "Rank 2"}
              </h1>
              <Badge variant="outline" className={statusBadgeClass(match.status as MatchStatus)}>
                {match.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatMatchDay(match.day, match.date)} · {match.venue ?? "Askari XI, Lahore"} · {match.oversPerSide ?? 10} Overs Match
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/live/${match.id}`} target="_blank">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-emerald-500/40 text-emerald-500">
              <Zap className="h-3.5 w-3.5" /> View Live Public Screen
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            className="text-xs gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-sm font-semibold"
            disabled={resetMatch.isPending}
            onClick={() => {
              if (
                confirm(
                  `⚠️ RESTART THIS MATCH?\n\nThis will permanently delete all innings, scorecards, batting/bowling statistics, and toss selection for ${teamA?.name ?? "Team A"} vs ${teamB?.name ?? "Team B"}.\n\nThe match will be reset to a clean UPCOMING state so you can start fresh.\n\nDo you want to proceed?`
                )
              ) {
                resetMatch.mutate();
              }
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restart Match (Reset DB)
          </Button>
        </div>
      </div>

      {/* Match Result Banner if completed */}
      {match.resultText && (
        <Card className="border-emerald-500/40 bg-emerald-500/10">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-500" />
              <p className="font-extrabold text-emerald-500 text-sm sm:text-base">
                {match.resultText}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={reopen.isPending}
              onClick={() => {
                if (confirm("Reopen this match for live scoring? Standings will adjust."))
                  reopen.mutate();
              }}
            >
              Reopen Match for Correction
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Start Match / Conduct Toss (if UPCOMING) */}
      {match.status === "UPCOMING" && teamA && teamB && (
        <StartMatchCard
          match={match}
          teamA={teamA}
          teamB={teamB}
          players={players}
          pending={startMatch.isPending}
          onStart={(args) => startMatch.mutate(args)}
        />
      )}

      {match.status === "UPCOMING" && (!teamA || !teamB) && (
        <Card className="border-dashed p-8 text-center text-muted-foreground">
          Teams are not set for this fixture yet. Populate teams in the Schedule tab first.
        </Card>
      )}

      {/* Main Mode Tabs: Live Scoring vs Playing VI Lineup */}
      <Tabs defaultValue="scoring" className="w-full">
        <TabsList className="grid w-80 grid-cols-2">
          <TabsTrigger value="scoring" className="text-xs font-bold gap-1.5">
            <Zap className="h-4 w-4 text-emerald-500" /> Live Scoring
          </TabsTrigger>
          <TabsTrigger value="lineup" className="text-xs font-bold gap-1.5">
            <Users className="h-4 w-4 text-sky-500" /> Playing VI Lineup (6+1)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Live Scoring */}
        <TabsContent value="scoring" className="mt-4 space-y-6">
          <Tabs value={activeInningsTab} onValueChange={setActiveInningsTab} className="w-full">
            <div className="flex items-center justify-between border-b pb-2">
              <TabsList className="grid w-80 grid-cols-2">
                <TabsTrigger value="1" className="text-xs font-bold">
                  1st Innings {inn1 ? `(${inn1.runs}/${inn1.wickets})` : ""}
                </TabsTrigger>
                <TabsTrigger value="2" className="text-xs font-bold">
                  2nd Innings {inn2 ? `(${inn2.runs}/${inn2.wickets})` : inn1?.completed ? `(Target: ${inn1.runs + 1})` : ""}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="1" className="mt-4">
              <InningsLiveConsole
                key={`innings-${match.id}-1-${inn1?.id ?? "fresh"}-${inn1?.runs ?? 0}`}
                matchId={match.id}
                inningsNumber={1}
                workspace={data}
                readOnly={false}
                onSaved={() => {
                  refetch();
                  invalidate();
                }}
                onInningsCompleted={() => {
                  setActiveInningsTab("2");
                  refetch();
                  invalidate();
                }}
              />
            </TabsContent>

            <TabsContent value="2" className="mt-4">
              <InningsLiveConsole
                key={`innings-${match.id}-2-${inn2?.id ?? "fresh"}-${inn1?.runs ?? 0}`}
                matchId={match.id}
                inningsNumber={2}
                workspace={data}
                readOnly={false}
                onSaved={() => {
                  refetch();
                  invalidate();
                }}
                onAutoFinalizeMatch={() => {
                  completeMatch.mutate({});
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Complete Match & Declare Winner */}
          {(inn1 || inn2) && (
            <CompleteMatchCard
              match={match}
              teams={teams}
              players={players}
              pending={completeMatch.isPending}
              onComplete={(playerOfMatchId) => {
                if (confirm("Declare match complete? The winner and points table will be finalized."))
                  completeMatch.mutate({ playerOfMatchId });
              }}
            />
          )}
        </TabsContent>

        {/* Tab 2: Playing VI Lineup Manager (6 Starters + 1 Reserve) */}
        <TabsContent value="lineup" className="mt-4">
          <PlayingVIEditor
            match={match}
            teams={teams}
            players={players}
            onSaved={() => {
              refetch();
              invalidate();
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Start Match / Toss & Playing VI Card
// ---------------------------------------------------------------------------

function StartMatchCard({
  match,
  teamA,
  teamB,
  players,
  pending,
  onStart,
}: {
  match: Match;
  teamA: Team;
  teamB: Team;
  players: Player[];
  pending: boolean;
  onStart: (args: {
    tossWinnerId: string;
    tossDecision: "BAT" | "BOWL";
    teamAPlayingVI: string[];
    teamAReserveId: string | null;
    teamBPlayingVI: string[];
    teamBReserveId: string | null;
  }) => void;
}) {
  const [tossWinner, setTossWinner] = useState<string>("");
  const [decision, setDecision] = useState<"BAT" | "BOWL">("BAT");

  const teamAPlayers = players.filter((p) => p.teamId === teamA.id);
  const teamBPlayers = players.filter((p) => p.teamId === teamB.id);

  // Lineup state for Team A
  const [teamAPlayingVI, setTeamAPlayingVI] = useState<string[]>(() => {
    if (match.teamAPlayingVI && match.teamAPlayingVI.length > 0) return match.teamAPlayingVI;
    return teamAPlayers.slice(0, 6).map((p) => p.id);
  });
  const [teamAReserveId, setTeamAReserveId] = useState<string>(() => {
    if (match.teamAReserveId) return match.teamAReserveId;
    return teamAPlayers[6]?.id ?? "";
  });

  // Lineup state for Team B
  const [teamBPlayingVI, setTeamBPlayingVI] = useState<string[]>(() => {
    if (match.teamBPlayingVI && match.teamBPlayingVI.length > 0) return match.teamBPlayingVI;
    return teamBPlayers.slice(0, 6).map((p) => p.id);
  });
  const [teamBReserveId, setTeamBReserveId] = useState<string>(() => {
    if (match.teamBReserveId) return match.teamBReserveId;
    return teamBPlayers[6]?.id ?? "";
  });

  const togglePlayerA = (id: string) => {
    if (teamAPlayingVI.includes(id)) {
      setTeamAPlayingVI(teamAPlayingVI.filter((p) => p !== id));
    } else {
      if (teamAPlayingVI.length >= 6) {
        toast.error("Playing squad is limited to 6 starting players (Indoor format).");
        return;
      }
      setTeamAPlayingVI([...teamAPlayingVI, id]);
      if (teamAReserveId === id) setTeamAReserveId("");
    }
  };

  const togglePlayerB = (id: string) => {
    if (teamBPlayingVI.includes(id)) {
      setTeamBPlayingVI(teamBPlayingVI.filter((p) => p !== id));
    } else {
      if (teamBPlayingVI.length >= 6) {
        toast.error("Playing squad is limited to 6 starting players (Indoor format).");
        return;
      }
      setTeamBPlayingVI([...teamBPlayingVI, id]);
      if (teamBReserveId === id) setTeamBReserveId("");
    }
  };

  const handleStartSubmit = () => {
    if (!tossWinner) {
      toast.error("Please select which team won the toss.");
      return;
    }
    if (teamAPlayingVI.length !== 6 && teamAPlayers.length >= 6) {
      toast.error(`Please select exactly 6 players for ${teamA.name} Playing VI.`);
      return;
    }
    if (teamBPlayingVI.length !== 6 && teamBPlayers.length >= 6) {
      toast.error(`Please select exactly 6 players for ${teamB.name} Playing VI.`);
      return;
    }

    onStart({
      tossWinnerId: tossWinner,
      tossDecision: decision,
      teamAPlayingVI,
      teamAReserveId: teamAReserveId || null,
      teamBPlayingVI,
      teamBReserveId: teamBReserveId || null,
    });
  };

  return (
    <Card className="border-emerald-500/40 bg-card shadow-lg">
      <CardHeader className="p-4 sm:p-5 border-b bg-emerald-500/5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2 text-emerald-500">
            <Zap className="h-5 w-5" /> 1. Conduct Toss & Set Match Playing VI (6+1)
          </CardTitle>
          <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-500 font-bold">
            Match Setup
          </Badge>
        </div>
        <CardDescription className="text-xs mt-1">
          Record the toss result and confirm the starting Playing VI (6 starters + 1 reserve) for both teams to go LIVE.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Section 1: Toss Results */}
        <div className="grid gap-4 sm:grid-cols-2 p-4 rounded-xl border bg-muted/20">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">🪙 Toss Won By</Label>
            <Select value={tossWinner || undefined} onValueChange={setTossWinner}>
              <SelectTrigger className="h-10 text-xs font-semibold">
                <SelectValue placeholder="Select team winning toss" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={teamA.id}>
                  {teamA.name} ({teamA.shortName})
                </SelectItem>
                <SelectItem value={teamB.id}>
                  {teamB.name} ({teamB.shortName})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">🎯 Toss Decision</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as "BAT" | "BOWL")}>
              <SelectTrigger className="h-10 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BAT">🏏 Elected to Bat First</SelectItem>
                <SelectItem value="BOWL">🎯 Elected to Bowl First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Section 2: Playing VI Lineup Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-emerald-500" /> Confirm 6 Playing + 1 Reserve for Each Team
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Team A Lineup */}
            <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <TeamBadge shortName={teamA.shortName} logoUrl={teamA.logoUrl} size="sm" />
                  <span className="font-bold text-xs sm:text-sm">{teamA.name}</span>
                </div>
                <Badge
                  variant={teamAPlayingVI.length === 6 ? "default" : "outline"}
                  className={teamAPlayingVI.length === 6 ? "bg-emerald-600 text-white text-[10px]" : "border-amber-500 text-amber-500 text-[10px]"}
                >
                  {teamAPlayingVI.length}/6 Starters
                </Badge>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {teamAPlayers.map((p) => {
                  const isSelected = teamAPlayingVI.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePlayerA(p.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500/50 font-semibold"
                          : "hover:bg-muted/40 border-border opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isSelected} />
                        <span>{p.name}</span>
                        {(p.isCaptain || p.designation === "Captain") && (
                          <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">(C)</Badge>
                        )}
                        {(p.isViceCaptain || p.designation === "Vice Captain") && (
                          <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold">(VC)</Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[9px]">{p.role}</Badge>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <ArrowRightLeft className="h-3 w-3 text-amber-500" /> Reserve Player (1):
                </Label>
                <Select value={teamAReserveId || undefined} onValueChange={setTeamAReserveId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Reserve Player" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamAPlayers
                      .filter((p) => !teamAPlayingVI.includes(p.id))
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Team B Lineup */}
            <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <TeamBadge shortName={teamB.shortName} logoUrl={teamB.logoUrl} size="sm" />
                  <span className="font-bold text-xs sm:text-sm">{teamB.name}</span>
                </div>
                <Badge
                  variant={teamBPlayingVI.length === 6 ? "default" : "outline"}
                  className={teamBPlayingVI.length === 6 ? "bg-emerald-600 text-white text-[10px]" : "border-amber-500 text-amber-500 text-[10px]"}
                >
                  {teamBPlayingVI.length}/6 Starters
                </Badge>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {teamBPlayers.map((p) => {
                  const isSelected = teamBPlayingVI.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePlayerB(p.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500/50 font-semibold"
                          : "hover:bg-muted/40 border-border opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox checked={isSelected} />
                        <span>{p.name}</span>
                        {(p.isCaptain || p.designation === "Captain") && (
                          <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">(C)</Badge>
                        )}
                        {(p.isViceCaptain || p.designation === "Vice Captain") && (
                          <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold">(VC)</Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[9px]">{p.role}</Badge>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                  <ArrowRightLeft className="h-3 w-3 text-amber-500" /> Reserve Player (1):
                </Label>
                <Select value={teamBReserveId || undefined} onValueChange={setTeamBReserveId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Reserve Player" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamBPlayers
                      .filter((p) => !teamBPlayingVI.includes(p.id))
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Start Match Button */}
        <Button
          disabled={pending || !tossWinner}
          onClick={handleStartSubmit}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base gap-2 shadow-md"
        >
          <Zap className="h-5 w-5 animate-pulse" /> Confirm Toss & Start Live Match
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ICC Live Ball-by-Ball Console & Scorecard Editor
// ---------------------------------------------------------------------------

type BatRow = {
  playerId: string;
  name: string;
  batted: boolean;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal: string;
};

type BowlRow = {
  playerId: string;
  name: string;
  bowled: boolean;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
};

function InningsLiveConsole({
  matchId,
  inningsNumber,
  workspace,
  readOnly,
  onSaved,
  onInningsCompleted,
  onAutoFinalizeMatch,
}: {
  matchId: string;
  inningsNumber: 1 | 2;
  workspace: WorkspaceData;
  readOnly: boolean;
  onSaved: () => void;
  onInningsCompleted?: () => void;
  onAutoFinalizeMatch?: () => void;
}) {
  const { innings, players, teams, match } = workspace;
  const existing = innings.find((i) => i.inningsNumber === inningsNumber);
  const inn1 = innings.find((i) => i.inningsNumber === 1);

  // Determine Batting & Bowling Teams
  let battingTeamId: string | null = existing?.battingTeamId ?? null;
  let bowlingTeamId: string | null = existing?.bowlingTeamId ?? null;

  if (inningsNumber === 2) {
    if (!battingTeamId && inn1) {
      battingTeamId = inn1.bowlingTeamId || (inn1.battingTeamId === match.teamAId ? match.teamBId : match.teamAId);
    }
    if (!battingTeamId) {
      battingTeamId = match.teamBId ?? null;
    }
    if (!bowlingTeamId) {
      bowlingTeamId = inn1?.battingTeamId || (battingTeamId === match.teamAId ? match.teamBId : match.teamAId) || (match.teamAId ?? null);
    }
  } else if (inningsNumber === 1) {
    if (!battingTeamId) {
      if (match.tossWinnerId && match.tossDecision) {
        battingTeamId =
          match.tossDecision === "BAT"
            ? match.tossWinnerId
            : match.tossWinnerId === match.teamAId
              ? match.teamBId
              : match.teamAId;
      } else {
        battingTeamId = match.teamAId ?? null;
      }
    }
    if (!bowlingTeamId) {
      bowlingTeamId = battingTeamId === match.teamAId ? (match.teamBId ?? null) : (match.teamAId ?? null);
    }
  }

  // Filter squad to only active Playing VI (6 starters), strictly excluding benched/reserve player unless subbed for injury
  const getPlayingSquad = (teamId: string | null) => {
    if (!teamId) return [];
    const teamSquad = players.filter((p) => p.teamId === teamId);

    const isTeamA = teamId === match.teamAId;
    const playingVI = isTeamA ? match.teamAPlayingVI : match.teamBPlayingVI;
    const reserveId = isTeamA ? match.teamAReserveId : match.teamBReserveId;

    if (playingVI && playingVI.length > 0) {
      return teamSquad.filter((p) => playingVI.includes(p.id));
    }
    if (reserveId) {
      return teamSquad.filter((p) => p.id !== reserveId);
    }
    // Default: first 6 are Playing VI starters, 7th is benched reserve
    if (teamSquad.length > 6) {
      return teamSquad.slice(0, 6);
    }
    return teamSquad;
  };

  const battingPlayers = getPlayingSquad(battingTeamId).slice(0, 6);
  const bowlingPlayers = getPlayingSquad(bowlingTeamId).slice(0, 6);
  const battingTeam = teams.find((t) => t.id === battingTeamId) || (battingTeamId === match.teamAId ? match.teamA : match.teamB);
  const bowlingTeam = teams.find((t) => t.id === bowlingTeamId) || (bowlingTeamId === match.teamAId ? match.teamA : match.teamB);

  // Batting and Bowling State (strictly limited to 6 Playing VI starters)
  const [batRows, setBatRows] = useState<BatRow[]>(() => {
    return battingPlayers.map((p) => {
      const ex = existing?.batting.find((b) => b.playerId === p.id);
      return {
        playerId: p.id,
        name: p.name,
        batted: !!ex,
        runs: ex?.runs ?? 0,
        balls: ex?.balls ?? 0,
        fours: ex?.fours ?? 0,
        sixes: ex?.sixes ?? 0,
        isOut: ex?.isOut ?? false,
        dismissal: ex?.dismissal ?? "",
      };
    });
  });

  const [bowlRows, setBowlRows] = useState<BowlRow[]>(() => {
    return bowlingPlayers.map((p) => {
      const ex = existing?.bowling.find((b) => b.playerId === p.id);
      return {
        playerId: p.id,
        name: p.name,
        bowled: !!ex,
        balls: ex?.balls ?? 0,
        maidens: ex?.maidens ?? 0,
        runs: ex?.runs ?? 0,
        wickets: ex?.wickets ?? 0,
        wides: ex?.wides ?? 0,
        noBalls: ex?.noBalls ?? 0,
      };
    });
  });

  const [extras, setExtras] = useState({
    wides: existing?.wides ?? 0,
    noBalls: existing?.noBalls ?? 0,
    byes: existing?.byes ?? 0,
    legByes: existing?.legByes ?? 0,
    penaltyRuns: existing?.penaltyRuns ?? 0,
  });

  const [closed, setClosed] = useState(existing?.completed ?? false);

  // Active batsmen & bowler state
  const [strikerId, setStrikerId] = useState<string>(() => {
    const notOut = batRows.filter((b) => b.batted && !b.isOut);
    return notOut[0]?.playerId ?? battingPlayers[0]?.id ?? "";
  });
  const [nonStrikerId, setNonStrikerId] = useState<string>(() => {
    const notOut = batRows.filter((b) => b.batted && !b.isOut);
    return notOut[1]?.playerId ?? battingPlayers[1]?.id ?? "";
  });
  const [currentBowlerId, setCurrentBowlerId] = useState<string>(() => {
    const totalBalls = existing?.bowling.reduce((s, b) => s + b.balls, 0) ?? 0;
    // If an over just completed (6, 12, 18, 24), bowler must be newly selected
    if (totalBalls > 0 && totalBalls % 6 === 0) {
      return "";
    }
    const activeBowlers = bowlRows.filter((b) => b.bowled);
    return activeBowlers[activeBowlers.length - 1]?.playerId ?? bowlingPlayers[0]?.id ?? "";
  });

  // Track the bowler who bowled the immediately preceding over (to prevent consecutive overs)
  const [lastOverBowlerId, setLastOverBowlerId] = useState<string | null>(() => {
    const totalBalls = existing?.bowling.reduce((s, b) => s + b.balls, 0) ?? 0;
    if (totalBalls > 0 && totalBalls % 6 === 0) {
      const active = existing?.bowling.filter((b) => b.balls > 0);
      return active?.[active.length - 1]?.playerId ?? null;
    }
    return null;
  });

  // Calculated Totals & Match Configuration (strictly 4 overs for league, 5 for final, max 5 wickets)
  const isFinal = match.stage === "FINAL";
  const maxMatchOvers = isFinal ? 5 : 4;
  const maxLegalBallsInnings = maxMatchOvers * 6; // strictly 24 balls for League, 30 for Final
  const maxWickets = 5; // 6 players per team: 5 dismissals = ALL OUT
  const target = inningsNumber === 2 && inn1 ? inn1.runs + 1 : null;

  const totalBatterRuns = useMemo(
    () => batRows.filter((b) => b.batted).reduce((s, b) => s + b.runs, 0),
    [batRows],
  );

  const totalExtras =
    extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penaltyRuns;

  const totalRuns = totalBatterRuns + totalExtras;
  const totalWickets = Math.min(maxWickets, batRows.filter((b) => b.batted && b.isOut).length);

  const totalLegalBalls = useMemo(
    () => bowlRows.filter((b) => b.bowled).reduce((s, b) => s + b.balls, 0),
    [bowlRows],
  );

  const isTargetReached = inningsNumber === 2 && target !== null && totalRuns >= target;
  const isAllOut = totalWickets >= maxWickets;
  const isOversQuotaDone = totalLegalBalls >= maxLegalBallsInnings;
  const isInningsFinished = closed || isOversQuotaDone || isAllOut || isTargetReached;

  const currentStriker = batRows.find((b) => b.playerId === strikerId);
  const currentNonStriker = batRows.find((b) => b.playerId === nonStrikerId);
  const currentBowler = bowlRows.find((b) => b.playerId === currentBowlerId);

  // Check how many bowlers have bowled 2 overs (in Final)
  const bowlersWith2Overs = bowlRows.filter((b) => b.balls >= 12);
  const alreadyHas2OverBowler = bowlersWith2Overs.length >= 1;

  const getBowlerMaxBalls = (playerId: string) => {
    if (!isFinal) return 6; // League: strictly 1 over (6 balls) max
    // Final: 1 bowler can bowl up to 2 overs (12 balls), others 1 over (6 balls)
    const bowler = bowlRows.find((b) => b.playerId === playerId);
    const bowlerBalls = bowler?.balls ?? 0;
    if (bowlerBalls >= 6) {
      if (!alreadyHas2OverBowler || bowlersWith2Overs.some((b) => b.playerId === playerId)) {
        return 12; // Eligible to bowl 2nd over
      }
      return 6; // Another bowler already took the 2-over quota
    }
    return 12; // Potentially eligible for 2 overs
  };

  const isBowlerQuotaExhausted = (playerId: string) => {
    const bowler = bowlRows.find((b) => b.playerId === playerId);
    const currentBalls = bowler?.balls ?? 0;
    const maxBalls = getBowlerMaxBalls(playerId);
    return currentBalls >= maxBalls;
  };

  // Auto-select initial batsmen and first bowler on innings start (0 legal balls only)
  useEffect(() => {
    if (!strikerId && battingPlayers.length > 0) {
      const notOut = batRows.filter((b) => b.batted && !b.isOut);
      setStrikerId(notOut[0]?.playerId ?? battingPlayers[0]?.id ?? "");
    }
    if (!nonStrikerId && battingPlayers.length > 1) {
      const notOut = batRows.filter((b) => b.batted && !b.isOut);
      setNonStrikerId(notOut[1]?.playerId ?? battingPlayers[1]?.id ?? "");
    }
    // Only auto-select bowler for 1st over (0 legal balls bowled)
    if (!currentBowlerId && bowlingPlayers.length > 0 && totalLegalBalls === 0) {
      setCurrentBowlerId(bowlingPlayers[0]?.id ?? "");
    }
  }, [battingPlayers, bowlingPlayers, batRows, strikerId, nonStrikerId, currentBowlerId, totalLegalBalls]);

  // Recent Balls Feed (History for this session & stored in Firestore)
  const [recentBalls, setRecentBalls] = useState<string[]>(() => existing?.recentBalls ?? []);
  const [historyStack, setHistoryStack] = useState<
    {
      batRows: BatRow[];
      bowlRows: BowlRow[];
      extras: typeof extras;
      strikerId: string;
      nonStrikerId: string;
      currentBowlerId: string;
      recentBalls: string[];
    }[]
  >([]);

  // Wicket Dialog State
  const [wicketModalOpen, setWicketModalOpen] = useState(false);
  const [dismissalType, setDismissalType] = useState<string>("Caught");
  const [outPlayerId, setOutPlayerId] = useState<string>("");
  const [incomingPlayerId, setIncomingPlayerId] = useState<string>("");

  // No Ball Dialog State (for scoring runs off No Ball)
  const [noBallModalOpen, setNoBallModalOpen] = useState(false);
  const [noBallCustomRuns, setNoBallCustomRuns] = useState<string>("0");

  // End of Over - Next Bowler Selection Modal State
  const [nextBowlerModalOpen, setNextBowlerModalOpen] = useState(false);
  const [completedOverNum, setCompletedOverNum] = useState<number>(1);
  const [selectedNextBowlerId, setSelectedNextBowlerId] = useState<string>("");

  // Trigger Next Bowler Selection Dialog on Over Completion or Quota Reached
  const triggerNextBowlerDialog = (newTotalBalls: number, previousBowlerId: string) => {
    if (newTotalBalls >= maxLegalBallsInnings) return; // Innings already finished
    const overNum = Math.floor(newTotalBalls / 6);
    setCompletedOverNum(Math.max(1, overNum));
    // Auto-find next eligible bowler other than the previous one (cannot bowl consecutive overs)
    const eligible = bowlingPlayers.filter(
      (p) => p.id !== previousBowlerId && !isBowlerQuotaExhausted(p.id),
    );
    setSelectedNextBowlerId(eligible[0]?.id ?? "");
    setNextBowlerModalOpen(true);
  };

  const handleConfirmNextBowler = () => {
    if (!selectedNextBowlerId) {
      toast.error("Please select the next bowler.");
      return;
    }
    if (lastOverBowlerId && selectedNextBowlerId === lastOverBowlerId) {
      toast.error("A bowler cannot bowl 2 consecutive overs. Please select a different bowler.");
      return;
    }
    setCurrentBowlerId(selectedNextBowlerId);
    setBowlRows((prev) =>
      prev.map((b) => (b.playerId === selectedNextBowlerId ? { ...b, bowled: true } : b)),
    );
    setNextBowlerModalOpen(false);
    const bName = bowlingPlayers.find((p) => p.id === selectedNextBowlerId)?.name ?? "Bowler";
    toast.success(`Bowler for Over ${completedOverNum + 1} set to ${bName}!`);
  };

  // Save Mutation
  const save = useMutation({
    mutationFn: (args: Parameters<typeof fbSaveInnings>[0]) => fbSaveInnings(args),
    onSuccess: () => {
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  // Save changes to Firestore
  const triggerSave = (
    newBat: BatRow[],
    newBowl: BowlRow[],
    newExtras: typeof extras,
    isCompleted = closed,
    customRecentBalls?: string[],
    recentEvent?: { type: "FOUR" | "SIX" | "WICKET" | "MAIDEN"; text?: string; timestamp: number } | null,
  ) => {
    const battingPayload = newBat
      .filter((r) => r.batted)
      .map((r, i) => ({
        playerId: r.playerId,
        battingOrder: i + 1,
        runs: r.runs,
        balls: r.balls,
        fours: r.fours,
        sixes: r.sixes,
        isOut: r.isOut,
        dismissal: r.dismissal || undefined,
      }));

    const bowlingPayload = newBowl
      .filter(
        (r) =>
          r.bowled &&
          (r.balls > 0 || r.wides > 0 || r.noBalls > 0 || r.runs > 0 || r.wickets > 0),
      )
      .map((r) => ({
        playerId: r.playerId,
        balls: r.balls,
        maidens: r.maidens,
        runs: r.runs,
        wickets: r.wickets,
        wides: r.wides,
        noBalls: r.noBalls,
      }));

    const totalRunsCalc =
      newBat.filter((b) => b.batted).reduce((s, b) => s + b.runs, 0) +
      newExtras.wides +
      newExtras.noBalls +
      newExtras.byes +
      newExtras.legByes +
      newExtras.penaltyRuns;
    const totalBallsCalc = newBowl.filter((b) => b.bowled).reduce((s, b) => s + b.balls, 0);

    const dynamicFow = getInningsFallOfWickets(
      {
        runs: totalRunsCalc,
        wickets: newBat.filter((b) => b.batted && b.isOut).length,
        balls: totalBallsCalc,
        batting: battingPayload,
      },
      players,
    );

    const dynamicPartnerships = getInningsPartnerships(
      {
        runs: totalRunsCalc,
        wickets: newBat.filter((b) => b.batted && b.isOut).length,
        balls: totalBallsCalc,
        batting: battingPayload,
      },
      players,
    );

    return save.mutateAsync({
      matchId,
      inningsNumber,
      wides: newExtras.wides,
      noBalls: newExtras.noBalls,
      byes: newExtras.byes,
      legByes: newExtras.legByes,
      penaltyRuns: newExtras.penaltyRuns,
      batting: battingPayload,
      bowling: bowlingPayload,
      completed: isCompleted,
      recentBalls: customRecentBalls ?? recentBalls,
      fallOfWickets: dynamicFow,
      partnerships: dynamicPartnerships,
      recentEvent,
    });
  };

  // Check if Innings or Match has ended
  const checkInningsAndMatchCompletion = (
    newBat: BatRow[],
    newBowl: BowlRow[],
    newExtras: typeof extras,
    newBalls: number,
  ): boolean => {
    const newBatterRuns = newBat.filter((b) => b.batted).reduce((s, b) => s + b.runs, 0);
    const newExtrasTotal =
      newExtras.wides + newExtras.noBalls + newExtras.byes + newExtras.legByes + newExtras.penaltyRuns;
    const newTotalRuns = newBatterRuns + newExtrasTotal;
    const newTotalWickets = newBat.filter((b) => b.batted && b.isOut).length;

    const isAllOut = newTotalWickets >= maxWickets;
    const isOversDone = newBalls >= maxLegalBallsInnings;

    if (inningsNumber === 1) {
      if (isOversDone || isAllOut) {
        setClosed(true);
        triggerSave(newBat, newBowl, newExtras, true)
          .then(() => {
            setTimeout(() => {
              onInningsCompleted?.();
            }, 400);
          })
          .catch(() => {});
        const reason = isAllOut ? "All Out (5 wickets fallen)" : `${maxMatchOvers} Overs Completed`;
        toast.success(
          `🏁 1st Innings Complete (${reason})! Target for 2nd Innings is ${newTotalRuns + 1} runs.`,
          { duration: 6000 },
        );
        return true;
      }
    } else if (inningsNumber === 2 && target !== null) {
      const targetReached = newTotalRuns >= target;
      if (targetReached || isOversDone || isAllOut) {
        setClosed(true);
        triggerSave(newBat, newBowl, newExtras, true)
          .then(() => {
            setTimeout(() => {
              onAutoFinalizeMatch?.();
            }, 400);
          })
          .catch(() => {});
        if (targetReached) {
          const wicketsRemaining = Math.max(1, 5 - newTotalWickets);
          toast.success(
            `🏆 Target Reached! ${battingTeam?.name ?? "Chasing Team"} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? "" : "s"}!`,
            { duration: 8000 },
          );
        } else {
          const runsMargin = Math.max(1, (target - 1) - newTotalRuns);
          const reason = isAllOut ? "Chasing Team All Out (5 wickets fallen)" : `${maxMatchOvers} Overs Completed`;
          toast.success(
            `🏆 Match Concluded (${reason})! ${bowlingTeam?.name ?? "Defending Team"} WON by ${runsMargin} runs!`,
            { duration: 8000 },
          );
        }
        return true;
      }
    }
    return false;
  };

  // Push snapshot to history stack for UNDO
  const pushHistory = () => {
    setHistoryStack((prev) => [
      ...prev,
      {
        batRows,
        bowlRows,
        extras,
        strikerId,
        nonStrikerId,
        currentBowlerId,
        recentBalls,
      },
    ]);
  };

  // Undo Last Ball
  const handleUndo = () => {
    if (historyStack.length === 0) {
      toast.error("No actions to undo");
      return;
    }
    const last = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    setBatRows(last.batRows);
    setBowlRows(last.bowlRows);
    setExtras(last.extras);
    setStrikerId(last.strikerId);
    setNonStrikerId(last.nonStrikerId);
    setCurrentBowlerId(last.currentBowlerId);
    setRecentBalls(last.recentBalls);
    triggerSave(last.batRows, last.bowlRows, last.extras);
    toast.success("Previous ball undone");
  };

  // Swap Strike
  const handleSwapStrike = () => {
    const temp = strikerId;
    setStrikerId(nonStrikerId);
    setNonStrikerId(temp);
    toast.info("Strike swapped");
  };

  // Record Runs from Bat (0, 1, 2, 3, 4, 6)
  const recordBall = (runsScored: number) => {
    if (closed) {
      toast.info("Innings is completed. Please switch to the next innings or finalize match.");
      return;
    }

    if (!strikerId) {
      toast.error("Please select the Striker.");
      return;
    }

    if (!currentBowlerId) {
      const nextOverNum = Math.floor(totalLegalBalls / 6) + 1;
      toast.error(`Please select the bowler for Over ${nextOverNum}.`);
      triggerNextBowlerDialog(totalLegalBalls, lastOverBowlerId ?? "");
      return;
    }

    if (lastOverBowlerId && currentBowlerId === lastOverBowlerId && totalLegalBalls > 0 && totalLegalBalls % 6 === 0) {
      const bName = bowlingPlayers.find((p) => p.id === currentBowlerId)?.name ?? "This bowler";
      toast.error(`Consecutive Over Guard: ${bName} just bowled the previous over and cannot bowl consecutive overs.`);
      triggerNextBowlerDialog(totalLegalBalls, lastOverBowlerId);
      return;
    }

    if (totalLegalBalls >= maxLegalBallsInnings) {
      toast.error(`Innings limit reached (${maxMatchOvers} overs).`);
      return;
    }

    if (totalWickets >= maxWickets) {
      toast.error(`Team is All Out (${maxWickets} wickets).`);
      return;
    }

    if (isBowlerQuotaExhausted(currentBowlerId)) {
      toast.info("This bowler has reached their maximum quota limit.");
      triggerNextBowlerDialog(totalLegalBalls, currentBowlerId);
      return;
    }

    pushHistory();

    const newBat = batRows.map((b) => {
      if (b.playerId === strikerId) {
        return {
          ...b,
          batted: true,
          runs: b.runs + runsScored,
          balls: b.balls + 1,
          fours: runsScored === 4 ? b.fours + 1 : b.fours,
          sixes: runsScored === 6 ? b.sixes + 1 : b.sixes,
        };
      }
      if (b.playerId === nonStrikerId) {
        return { ...b, batted: true };
      }
      return b;
    });

    const newBowl = bowlRows.map((b) => {
      if (b.playerId === currentBowlerId) {
        return {
          ...b,
          bowled: true,
          balls: b.balls + 1,
          runs: b.runs + runsScored,
        };
      }
      return b;
    });

    // Check if legal ball count ends the over (multiple of 6)
    const newTotalBalls = totalLegalBalls + 1;
    const isOverEnd = newTotalBalls % 6 === 0;

    // Change strike on odd runs (1, 3)
    let nextStriker = strikerId;
    let nextNonStriker = nonStrikerId;
    if (runsScored % 2 !== 0) {
      nextStriker = nonStrikerId;
      nextNonStriker = strikerId;
    }

    // Change strike on over completion
    if (isOverEnd) {
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
    }

    setStrikerId(nextStriker);
    setNonStrikerId(nextNonStriker);
    setBatRows(newBat);
    setBowlRows(newBowl);

    const ballStr = runsScored === 0 ? "0" : runsScored.toString();
    const newRecentBalls = [...recentBalls, ballStr];
    setRecentBalls(newRecentBalls);

    // Check if this over end was a Maiden Over (0 runs conceded across 6 legal balls)
    let isMaiden = false;
    if (isOverEnd) {
      let overLegalCount = 0;
      let overRuns = 0;
      for (let i = newRecentBalls.length - 1; i >= 0; i--) {
        const b = newRecentBalls[i];
        if (b === "4" || b === "Nb+4") overRuns += 4;
        else if (b === "6" || b === "Nb+6") overRuns += 6;
        else if (b === "1" || b === "2" || b === "3") overRuns += Number(b);
        else if (b.toLowerCase().includes("wd") || b.toLowerCase().startsWith("nb")) {
          overRuns += 1;
        }

        const isLegal = !b.toLowerCase().includes("wd") && !b.toLowerCase().startsWith("nb");
        if (isLegal) overLegalCount++;
        if (overLegalCount === 6) break;
      }
      isMaiden = overRuns === 0;
    }

    let finalBowl = newBowl;
    if (isMaiden) {
      finalBowl = newBowl.map((b) =>
        b.playerId === currentBowlerId ? { ...b, maidens: b.maidens + 1 } : b,
      );
      setBowlRows(finalBowl);
    }

    // Event notification for public viewers
    let celebrationEvent: { type: "FOUR" | "SIX" | "WICKET" | "MAIDEN"; text?: string; timestamp: number } | null = null;
    const strikerPlayer = battingPlayers.find((p) => p.id === strikerId);
    const bowlerPlayer = bowlingPlayers.find((p) => p.id === currentBowlerId);

    if (runsScored === 4) {
      celebrationEvent = {
        type: "FOUR",
        text: `${strikerPlayer?.name ?? "Striker"} smashes a gorgeous boundary FOUR! 🏏`,
        timestamp: Date.now(),
      };
    } else if (runsScored === 6) {
      celebrationEvent = {
        type: "SIX",
        text: `${strikerPlayer?.name ?? "Striker"} launches a colossal MAXIMUM SIX! 🚀`,
        timestamp: Date.now(),
      };
    } else if (isMaiden) {
      celebrationEvent = {
        type: "MAIDEN",
        text: `MAIDEN OVER! Outstanding 0-run spell by ${bowlerPlayer?.name ?? "Bowler"}! 🎯`,
        timestamp: Date.now(),
      };
      toast.success(`🎯 MAIDEN OVER delivered by ${bowlerPlayer?.name ?? "Bowler"}!`);
    }

    const isFinished = checkInningsAndMatchCompletion(newBat, finalBowl, extras, newTotalBalls);
    if (!isFinished) {
      triggerSave(newBat, finalBowl, extras, false, newRecentBalls, celebrationEvent);
      if (isOverEnd) {
        const finishedBowler = currentBowlerId;
        setLastOverBowlerId(finishedBowler);
        setCurrentBowlerId("");
        triggerNextBowlerDialog(newTotalBalls, finishedBowler);
      }
    }
  };

  // Record Extras (Wide, No Ball, Bye, Leg Bye)
  const recordExtra = (type: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE", extraRuns = 1) => {
    if (closed) {
      toast.info("Innings is completed.");
      return;
    }

    if (!currentBowlerId) {
      const nextOverNum = Math.floor(totalLegalBalls / 6) + 1;
      toast.error(`Please select the bowler for Over ${nextOverNum}.`);
      triggerNextBowlerDialog(totalLegalBalls, lastOverBowlerId ?? "");
      return;
    }

    if (lastOverBowlerId && currentBowlerId === lastOverBowlerId && totalLegalBalls > 0 && totalLegalBalls % 6 === 0) {
      const bName = bowlingPlayers.find((p) => p.id === currentBowlerId)?.name ?? "This bowler";
      toast.error(`Consecutive Over Guard: ${bName} just bowled the previous over and cannot bowl consecutive overs.`);
      triggerNextBowlerDialog(totalLegalBalls, lastOverBowlerId);
      return;
    }

    if (totalLegalBalls >= maxLegalBallsInnings && (type === "BYE" || type === "LEG_BYE")) {
      toast.error(`Innings limit reached (${maxMatchOvers} overs).`);
      return;
    }

    if (totalWickets >= maxWickets) {
      toast.error(`Team is All Out (${maxWickets} wickets).`);
      return;
    }

    if (isBowlerQuotaExhausted(currentBowlerId)) {
      toast.info("This bowler has reached their maximum quota limit.");
      triggerNextBowlerDialog(totalLegalBalls, currentBowlerId);
      return;
    }

    pushHistory();

    const newExtras = { ...extras };
    let newBowl = [...bowlRows];
    let newBat = [...batRows];
    let isOverEnd = false;
    let newTotalBalls = totalLegalBalls;
    let extraBallTag = "Wd";

    if (type === "WIDE") {
      newExtras.wides += extraRuns;
      newBowl = newBowl.map((b) =>
        b.playerId === currentBowlerId
          ? { ...b, bowled: true, runs: b.runs + extraRuns, wides: b.wides + extraRuns }
          : b,
      );
      extraBallTag = extraRuns > 1 ? `${extraRuns}Wd` : "Wd";
    } else if (type === "NO_BALL") {
      newExtras.noBalls += extraRuns;
      newBowl = newBowl.map((b) =>
        b.playerId === currentBowlerId
          ? { ...b, bowled: true, runs: b.runs + extraRuns, noBalls: b.noBalls + 1 }
          : b,
      );
      extraBallTag = extraRuns > 1 ? `${extraRuns}Nb` : "Nb";
    } else if (type === "BYE") {
      newTotalBalls = totalLegalBalls + 1;
      isOverEnd = newTotalBalls % 6 === 0;
      newExtras.byes += extraRuns;
      newBowl = newBowl.map((b) =>
        b.playerId === currentBowlerId ? { ...b, bowled: true, balls: b.balls + 1 } : b,
      );
      newBat = newBat.map((b) =>
        b.playerId === strikerId ? { ...b, batted: true, balls: b.balls + 1 } : b,
      );
      extraBallTag = `${extraRuns}B`;
    } else if (type === "LEG_BYE") {
      newTotalBalls = totalLegalBalls + 1;
      isOverEnd = newTotalBalls % 6 === 0;
      newExtras.legByes += extraRuns;
      newBowl = newBowl.map((b) =>
        b.playerId === currentBowlerId ? { ...b, bowled: true, balls: b.balls + 1 } : b,
      );
      newBat = newBat.map((b) =>
        b.playerId === strikerId ? { ...b, batted: true, balls: b.balls + 1 } : b,
      );
      extraBallTag = `${extraRuns}Lb`;
    }

    if (isOverEnd) {
      const temp = strikerId;
      setStrikerId(nonStrikerId);
      setNonStrikerId(temp);
    }

    const newRecentBalls = [...recentBalls, extraBallTag];
    setRecentBalls(newRecentBalls);

    setExtras(newExtras);
    setBowlRows(newBowl);
    setBatRows(newBat);

    const isFinished = checkInningsAndMatchCompletion(newBat, newBowl, newExtras, newTotalBalls);
    if (!isFinished) {
      triggerSave(newBat, newBowl, newExtras, false, newRecentBalls);
      if (isOverEnd) {
        const finishedBowler = currentBowlerId;
        setLastOverBowlerId(finishedBowler);
        setCurrentBowlerId("");
        triggerNextBowlerDialog(newTotalBalls, finishedBowler);
      }
    }
  };

  // Record No Ball with runs scored off the bat (0, 1, 2, 3, 4, 6, or custom)
  const recordNoBall = (batsmanRuns = 0, isByeOrLegBye = false) => {
    if (closed) {
      toast.info("Innings is completed.");
      return;
    }
    if (!strikerId) {
      toast.error("Please select the Striker.");
      return;
    }
    if (!currentBowlerId) {
      const nextOverNum = Math.floor(totalLegalBalls / 6) + 1;
      toast.error(`Please select the bowler for Over ${nextOverNum}.`);
      triggerNextBowlerDialog(totalLegalBalls, lastOverBowlerId ?? "");
      return;
    }
    if (lastOverBowlerId && currentBowlerId === lastOverBowlerId && totalLegalBalls > 0 && totalLegalBalls % 6 === 0) {
      const bName = bowlingPlayers.find((p) => p.id === currentBowlerId)?.name ?? "This bowler";
      toast.error(`Consecutive Over Guard: ${bName} just bowled the previous over and cannot bowl consecutive overs.`);
      triggerNextBowlerDialog(totalLegalBalls, lastOverBowlerId);
      return;
    }
    if (isBowlerQuotaExhausted(currentBowlerId)) {
      toast.info("This bowler has reached their maximum quota limit.");
      triggerNextBowlerDialog(totalLegalBalls, currentBowlerId);
      return;
    }

    pushHistory();

    const newExtras = { ...extras };
    newExtras.noBalls += 1; // 1 penalty run for No Ball

    let newBat = [...batRows];
    let newBowl = [...bowlRows];

    // Total runs scored on this delivery conceded by bowler = 1 Nb + batsmanRuns
    const totalRunsThisBall = 1 + batsmanRuns;

    if (batsmanRuns > 0 && !isByeOrLegBye) {
      newBat = newBat.map((b) => {
        if (b.playerId === strikerId) {
          return {
            ...b,
            batted: true,
            runs: b.runs + batsmanRuns,
            balls: b.balls + 1,
            fours: batsmanRuns === 4 ? b.fours + 1 : b.fours,
            sixes: batsmanRuns === 6 ? b.sixes + 1 : b.sixes,
          };
        }
        return b;
      });
    } else if (!isByeOrLegBye) {
      newBat = newBat.map((b) =>
        b.playerId === strikerId ? { ...b, batted: true, balls: b.balls + 1 } : b,
      );
    }

    // Bowler figures: bowled is true, runs += totalRunsThisBall, noBalls count += 1 (balls NOT incremented)
    newBowl = newBowl.map((b) =>
      b.playerId === currentBowlerId
        ? {
            ...b,
            bowled: true,
            runs: b.runs + totalRunsThisBall,
            noBalls: b.noBalls + 1,
          }
        : b,
    );

    // Rotate strike if odd runs scored off bat
    if (batsmanRuns % 2 === 1) {
      const temp = strikerId;
      setStrikerId(nonStrikerId);
      setNonStrikerId(temp);
    }

    // Recent ball display tag
    const tag = batsmanRuns > 0 ? `Nb+${batsmanRuns}` : "Nb";
    const newRecentBalls = [...recentBalls, tag];
    setRecentBalls(newRecentBalls);

    // Event notification for public viewers
    let celebrationEvent: { type: "FOUR" | "SIX" | "WICKET"; text?: string; timestamp: number } | null = null;
    if (batsmanRuns === 4) {
      celebrationEvent = {
        type: "FOUR",
        text: `NO BALL & BOUNDARY FOUR! 🏏`,
        timestamp: Date.now(),
      };
    } else if (batsmanRuns === 6) {
      celebrationEvent = {
        type: "SIX",
        text: `NO BALL & MAXIMUM SIX! 🚀`,
        timestamp: Date.now(),
      };
    }

    setExtras(newExtras);
    setBowlRows(newBowl);
    setBatRows(newBat);
    setNoBallModalOpen(false);

    const isFinished = checkInningsAndMatchCompletion(newBat, newBowl, newExtras, totalLegalBalls);
    if (!isFinished) {
      triggerSave(newBat, newBowl, newExtras, false, newRecentBalls, celebrationEvent);
    }
  };

  // Open Wicket Popup
  const promptWicket = () => {
    if (closed) {
      toast.info("Innings is completed.");
      return;
    }
    if (!currentBowlerId) {
      const nextOverNum = Math.floor(totalLegalBalls / 6) + 1;
      toast.error(`Please select the bowler for Over ${nextOverNum}.`);
      triggerNextBowlerDialog(totalLegalBalls, lastOverBowlerId ?? "");
      return;
    }
    if (lastOverBowlerId && currentBowlerId === lastOverBowlerId && totalLegalBalls > 0 && totalLegalBalls % 6 === 0) {
      const bName = bowlingPlayers.find((p) => p.id === currentBowlerId)?.name ?? "This bowler";
      toast.error(`Consecutive Over Guard: ${bName} just bowled the previous over and cannot bowl consecutive overs.`);
      triggerNextBowlerDialog(totalLegalBalls, lastOverBowlerId);
      return;
    }
    if (totalWickets >= maxWickets) {
      toast.error(`Team is already All Out (${maxWickets} wickets).`);
      return;
    }
    setOutPlayerId(strikerId);
    const unbatted = batRows.filter((b) => !b.batted && !b.isOut);
    setIncomingPlayerId(unbatted[0]?.playerId ?? "");
    setWicketModalOpen(true);
  };

  // Confirm Wicket
  const confirmWicket = () => {
    pushHistory();

    const newBat = batRows.map((b) => {
      if (b.playerId === outPlayerId) {
        return {
          ...b,
          batted: true,
          balls: b.balls + 1,
          isOut: true,
          dismissal: dismissalType,
        };
      }
      return b;
    });

    const newBowl = bowlRows.map((b) => {
      if (b.playerId === currentBowlerId) {
        const isBowlerWicket = dismissalType !== "Run Out";
        return {
          ...b,
          bowled: true,
          balls: b.balls + 1,
          wickets: isBowlerWicket ? b.wickets + 1 : b.wickets,
        };
      }
      return b;
    });

    const newTotalBalls = totalLegalBalls + 1;
    const isOverEnd = newTotalBalls % 6 === 0;

    // Replace out batsman with incoming batsman
    let nextStriker = strikerId;
    let nextNonStriker = nonStrikerId;

    if (outPlayerId === strikerId) {
      nextStriker = incomingPlayerId;
    } else {
      nextNonStriker = incomingPlayerId;
    }

    if (isOverEnd) {
      const temp = nextStriker;
      nextStriker = nextNonStriker;
      nextNonStriker = temp;
    }

    setStrikerId(nextStriker);
    setNonStrikerId(nextNonStriker);
    setBatRows(newBat);
    setBowlRows(newBowl);

    const newRecentBalls = [...recentBalls, "W"];
    setRecentBalls(newRecentBalls);
    setWicketModalOpen(false);

    const outPlayer = battingPlayers.find((p) => p.id === outPlayerId);
    const celebrationEvent = {
      type: "WICKET" as const,
      text: `WICKET! ${outPlayer?.name ?? "Batsman"} is OUT (${dismissalType})! 🔴`,
      timestamp: Date.now(),
    };

    const isFinished = checkInningsAndMatchCompletion(newBat, newBowl, extras, newTotalBalls);
    if (!isFinished) {
      triggerSave(newBat, newBowl, extras, false, newRecentBalls, celebrationEvent);
      toast.success(`Wicket recorded (${dismissalType})!`);
      if (isOverEnd) {
        const finishedBowler = currentBowlerId;
        setLastOverBowlerId(finishedBowler);
        setCurrentBowlerId("");
        triggerNextBowlerDialog(newTotalBalls, finishedBowler);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Match Scoreboard Banner */}
      <Card className="border-emerald-500/30 bg-card shadow-md">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                  {battingTeam?.name} (Innings {inningsNumber})
                </span>
                {closed && (
                  <Badge variant="secondary" className="text-[10px]">
                    Innings Completed
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-3xl sm:text-4xl font-black font-mono text-foreground">
                  {totalRuns}/{totalWickets}
                </span>
                <span className="text-sm font-semibold text-muted-foreground font-mono">
                  ({ballsToOversText(totalLegalBalls)} / {maxMatchOvers} ov)
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>
                  CRR:{" "}
                  <strong>
                    {totalLegalBalls > 0 ? ((totalRuns / totalLegalBalls) * 6).toFixed(2) : "0.00"}
                  </strong>
                </span>
                {inningsNumber === 2 && inn1 && (
                  <span>
                    Target: <strong>{inn1.runs + 1}</strong> (Need{" "}
                    <strong>{Math.max(0, inn1.runs + 1 - totalRuns)}</strong> runs from{" "}
                    <strong>
                      {Math.max(0, maxLegalBallsInnings - totalLegalBalls)}
                    </strong>{" "}
                    balls)
                  </span>
                )}
              </div>
            </div>

            {/* Over Wheel / Recent Deliveries with Over Separator */}
            <div className="flex flex-col items-start sm:items-end gap-1.5 w-full sm:w-auto">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Recent Deliveries
              </span>
              <RecentBalls balls={recentBalls} maxOversToShow={maxMatchOvers} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning if squad players are missing */}
      {/* 1st Innings Finished Banner -> Switch to 2nd Innings */}
      {inningsNumber === 1 && closed && (
        <Card className="border-emerald-500 bg-emerald-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-emerald-400">🏁 1st Innings Finished!</h4>
            <p className="text-xs text-muted-foreground">
              {battingTeam?.name} scored <strong>{totalRuns}/{totalWickets}</strong>. Target for {bowlingTeam?.name} is <strong>{totalRuns + 1} runs</strong>.
            </p>
          </div>
          <Button
            onClick={() => onInningsCompleted?.()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs"
          >
            🏏 Start 2nd Innings (Target: {totalRuns + 1}) <ArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {/* 2nd Innings Target & Chase Banner */}
      {inningsNumber === 2 && target !== null && (
        <Card className="border-sky-500/40 bg-sky-500/10 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Badge className="bg-sky-600 text-white font-bold">🎯 TARGET: {target}</Badge>
            <span className="font-medium text-foreground">
              {totalRuns >= target ? (
                <strong className="text-emerald-400">Target reached! Match won!</strong>
              ) : (
                <>Need <strong className="text-sky-400 font-bold">{Math.max(0, target - totalRuns)}</strong> runs from <strong className="font-bold">{Math.max(0, maxLegalBallsInnings - totalLegalBalls)}</strong> balls</>
              )}
            </span>
          </div>
          <span className="font-mono text-muted-foreground">
            RRR: {Math.max(0, maxLegalBallsInnings - totalLegalBalls) > 0 ? (((Math.max(0, target - totalRuns)) / Math.max(1, maxLegalBallsInnings - totalLegalBalls)) * 6).toFixed(2) : "0.00"}
          </span>
        </Card>
      )}

      {(battingPlayers.length === 0 || bowlingPlayers.length === 0) && (
        <Card className="border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-xs font-bold text-amber-500 flex items-center gap-2">
            ⚠️ Player squad not found for {battingPlayers.length === 0 ? (battingTeam?.name ?? "Batting Team") : (bowlingTeam?.name ?? "Bowling Team")}.
            <Link to="/admin/players" className="underline font-black text-amber-400 ml-1">
              Add squad players in Admin ➔ Players
            </Link>
          </p>
        </Card>
      )}

      {/* ICC Live On-Field Players & Keypad Controls */}
      {!readOnly && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Active Batsmen & Bowler Selector */}
          <Card className="lg:col-span-1 border-border/80 bg-card">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-500" /> Active Players on Field
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwapStrike}
                  className="h-7 text-xs gap-1 px-2"
                >
                  <ArrowRightLeft className="h-3 w-3" /> Swap Strike
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Striker Selector */}
              <div className="space-y-1.5 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-amber-500 flex items-center gap-1">
                    🏏 Striker (*)
                  </Label>
                  {currentStriker && (
                    <span className="text-xs font-mono font-bold text-amber-500">
                      {currentStriker.runs} ({currentStriker.balls}b) [4s:{currentStriker.fours} 6s:
                      {currentStriker.sixes}]
                    </span>
                  )}
                </div>
                <Select value={strikerId || undefined} onValueChange={setStrikerId}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue placeholder="Select Striker" />
                  </SelectTrigger>
                  <SelectContent>
                    {battingPlayers.map((p) => {
                      const row = batRows.find((b) => b.playerId === p.id);
                      return (
                        <SelectItem key={p.id} value={p.id} disabled={row?.isOut}>
                          {p.name} {row?.isOut ? "(OUT)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Non-Striker Selector */}
              <div className="space-y-1.5 p-2.5 rounded-xl border bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-muted-foreground">
                    🏏 Non-Striker
                  </Label>
                  {currentNonStriker && (
                    <span className="text-xs font-mono font-bold text-foreground">
                      {currentNonStriker.runs} ({currentNonStriker.balls}b)
                    </span>
                  )}
                </div>
                <Select value={nonStrikerId || undefined} onValueChange={setNonStrikerId}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue placeholder="Select Non-Striker" />
                  </SelectTrigger>
                  <SelectContent>
                    {battingPlayers.map((p) => {
                      const row = batRows.find((b) => b.playerId === p.id);
                      return (
                        <SelectItem key={p.id} value={p.id} disabled={row?.isOut}>
                          {p.name} {row?.isOut ? "(OUT)" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Bowler Selector */}
              <div className="space-y-1.5 p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-sky-500 flex items-center gap-1">
                    🎯 Current Bowler
                  </Label>
                  <div className="flex items-center gap-1.5">
                    {currentBowler && (
                      <span className="text-xs font-mono font-bold text-sky-500">
                        {ballsToOversText(currentBowler.balls)} ov · {currentBowler.runs}r ·{" "}
                        {currentBowler.wickets}w
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => triggerNextBowlerDialog(totalLegalBalls, currentBowlerId)}
                      className="h-6 text-[10px] px-1.5 text-sky-500 hover:text-sky-400 font-bold border border-sky-500/30"
                    >
                      🔄 Change
                    </Button>
                  </div>
                </div>
                <Select
                  value={currentBowlerId || undefined}
                  onValueChange={(id) => {
                    if (id === lastOverBowlerId && totalLegalBalls > 0 && totalLegalBalls % 6 === 0) {
                      toast.error("A bowler cannot bowl 2 consecutive overs.");
                      return;
                    }
                    setCurrentBowlerId(id);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue placeholder="Select Bowler for this over" />
                  </SelectTrigger>
                  <SelectContent>
                    {bowlingPlayers.map((p) => {
                      const row = bowlRows.find((b) => b.playerId === p.id);
                      const bCount = row?.balls ?? 0;
                      const isExhausted = isBowlerQuotaExhausted(p.id);
                      const maxB = getBowlerMaxBalls(p.id);
                      const isConsecutive =
                        p.id === lastOverBowlerId && totalLegalBalls > 0 && totalLegalBalls % 6 === 0;

                      return (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          disabled={isExhausted || isConsecutive}
                        >
                          {p.name} ({ballsToOversText(bCount)} / {ballsToOversText(maxB)} ov)
                          {isConsecutive
                            ? " [Cannot bowl consecutive overs]"
                            : isExhausted
                              ? " [LIMIT REACHED]"
                              : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ICC Interactive Ball-by-Ball Keypad */}
          <Card className="lg:col-span-2 border-border/80 bg-card">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-500" /> ICC Live Scoring Keypad
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tap any run or extra to automatically update individual scorecards and overs.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyStack.length === 0}
                  className="h-7 text-xs gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" /> Undo Ball
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* Innings Completed Status Card */}
              {isInningsFinished && (
                <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-emerald-400">
                        Innings {inningsNumber} Concluded & Scoring Locked
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isTargetReached
                          ? `🏆 Target Reached (${totalRuns}/${totalWickets} in ${ballsToOversText(totalLegalBalls)} ov) — ${battingTeam?.name ?? (battingTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name) ?? "Chasing Team"} won by ${Math.max(1, 5 - totalWickets)} wicket${5 - totalWickets === 1 ? "" : "s"}!`
                          : inningsNumber === 2 && (isAllOut || isOversQuotaDone)
                            ? `🏆 ${bowlingTeam?.name ?? (bowlingTeamId === match.teamAId ? match.teamA?.name : match.teamB?.name) ?? "Defending Team"} WON by ${Math.max(1, (target ? target - 1 : 0) - totalRuns)} runs! (${isAllOut ? "Chasing Team All Out" : `${maxMatchOvers}.0 Overs Completed`})`
                            : isAllOut
                              ? `🏁 Team All Out (5 wickets fallen in ${ballsToOversText(totalLegalBalls)} ov)`
                              : `🏁 Quota Reached (${maxMatchOvers}.0 Overs Completed)`}
                      </p>
                    </div>
                  </div>
                  {inningsNumber === 1 && onInningsCompleted && (
                    <Button
                      size="sm"
                      onClick={onInningsCompleted}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow"
                    >
                      Go to 2nd Innings Scorecard <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}

              {/* Runs Buttons */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Runs Off Bat
                </span>
                <div className="grid grid-cols-6 gap-2 sm:gap-3">
                  {[0, 1, 2, 3, 4, 6].map((runs) => (
                    <Button
                      key={runs}
                      type="button"
                      disabled={isInningsFinished || readOnly || !currentBowlerId}
                      variant={runs === 4 ? "default" : runs === 6 ? "default" : "outline"}
                      className={`h-14 sm:h-16 text-lg sm:text-2xl font-black font-mono rounded-xl transition-all shadow-sm ${
                        runs === 4
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : runs === 6
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "hover:bg-accent"
                      }`}
                      onClick={() => recordBall(runs)}
                    >
                      {runs === 0 ? "• Dot" : runs}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Extras & Wicket Buttons */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Extras & Dismissals
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isInningsFinished || readOnly || !currentBowlerId}
                    className="h-12 font-bold text-xs bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400 rounded-xl"
                    onClick={() => recordExtra("WIDE", 1)}
                  >
                    +1 Wide (Wd)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isInningsFinished || readOnly || !currentBowlerId}
                    className="h-12 font-bold text-xs bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-500 rounded-xl"
                    onClick={() => setNoBallModalOpen(true)}
                  >
                    ⚡ No Ball (Nb)...
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isInningsFinished || readOnly || !currentBowlerId}
                    className="h-12 font-bold text-xs bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400 rounded-xl"
                    onClick={() => recordNoBall(0)}
                  >
                    +1 Nb (Dot)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isInningsFinished || readOnly || !currentBowlerId}
                    className="h-12 font-bold text-xs rounded-xl"
                    onClick={() => recordExtra("BYE", 1)}
                  >
                    +1 Bye
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isInningsFinished || readOnly || !currentBowlerId}
                    className="h-12 font-bold text-xs rounded-xl"
                    onClick={() => recordExtra("LEG_BYE", 1)}
                  >
                    +1 Leg Bye
                  </Button>
                  <Button
                    type="button"
                    disabled={isInningsFinished || readOnly || totalWickets >= maxWickets}
                    className="h-12 font-black text-sm bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md col-span-2 sm:col-span-1"
                    onClick={promptWicket}
                  >
                    🔴 WICKET
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Editable Batting & Bowling Scorecards */}
      <div className="space-y-6 pt-4 border-t">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Innings Scorecard Details</h3>
            <p className="text-xs text-muted-foreground">
              Review and manually fine-tune individual player runs, overs, and extras.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="closed"
                checked={closed}
                onCheckedChange={(v) => setClosed(!!v)}
                disabled={readOnly}
              />
              <label htmlFor="closed" className="text-xs font-semibold cursor-pointer">
                Innings Completed (All out / Overs done)
              </label>
            </div>
            <Button
              onClick={() => triggerSave(batRows, bowlRows, extras, closed)}
              disabled={readOnly || save.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Save & Broadcast Scorecard
            </Button>
          </div>
        </div>

        {/* Batting Table */}
        <div className="rounded-xl border overflow-x-auto shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 text-xs">
                <TableHead className="w-12 text-center">Batted</TableHead>
                <TableHead>Batter</TableHead>
                <TableHead className="w-20 text-right">Runs</TableHead>
                <TableHead className="w-20 text-right">Balls</TableHead>
                <TableHead className="w-16 text-right">4s</TableHead>
                <TableHead className="w-16 text-right">6s</TableHead>
                <TableHead className="w-20 text-right font-bold text-emerald-500">SR</TableHead>
                <TableHead className="w-20 text-center">Out?</TableHead>
                <TableHead>Dismissal Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batRows.map((r, i) => {
                const strikeRate = r.batted && r.balls > 0 ? ((r.runs / r.balls) * 100).toFixed(1) : "0.0";
                return (
                  <TableRow key={r.playerId} className="hover:bg-muted/30">
                    <TableCell className="text-center">
                      <Checkbox
                        checked={r.batted}
                        onCheckedChange={(v) => {
                          const updated = [...batRows];
                          updated[i].batted = !!v;
                          setBatRows(updated);
                        }}
                        disabled={readOnly}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {r.playerId === strikerId && (
                        <span className="text-amber-500 font-black mr-1">*</span>
                      )}
                      {r.name}
                      {r.playerId === strikerId && (
                        <Badge className="ml-2 bg-amber-600 text-white text-[9px] py-0 px-1">
                          Striker
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={r.runs}
                        disabled={readOnly || !r.batted}
                        onChange={(e) => {
                          const updated = [...batRows];
                          updated[i].runs = Math.max(0, Number(e.target.value) || 0);
                          setBatRows(updated);
                        }}
                        className="w-16 h-8 text-right font-mono font-bold ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={r.balls}
                        disabled={readOnly || !r.batted}
                        onChange={(e) => {
                          const updated = [...batRows];
                          updated[i].balls = Math.max(0, Number(e.target.value) || 0);
                          setBatRows(updated);
                        }}
                        className="w-16 h-8 text-right font-mono ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={r.fours}
                        disabled={readOnly || !r.batted}
                        onChange={(e) => {
                          const updated = [...batRows];
                          updated[i].fours = Math.max(0, Number(e.target.value) || 0);
                          setBatRows(updated);
                        }}
                        className="w-14 h-8 text-right font-mono ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={r.sixes}
                        disabled={readOnly || !r.batted}
                        onChange={(e) => {
                          const updated = [...batRows];
                          updated[i].sixes = Math.max(0, Number(e.target.value) || 0);
                          setBatRows(updated);
                        }}
                        className="w-14 h-8 text-right font-mono ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                      {strikeRate}
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={r.isOut}
                        onCheckedChange={(v) => {
                          const currentOutCount = batRows.filter((b, idx) => idx !== i && b.isOut).length;
                          if (v && currentOutCount >= maxWickets) {
                            toast.error("Maximum 5 wickets fallen (All Out in 6-player format).");
                            return;
                          }
                          const updated = [...batRows];
                          updated[i].isOut = !!v;
                          setBatRows(updated);
                        }}
                        disabled={readOnly || !r.batted}
                      />
                    </TableCell>
                  <TableCell>
                    <Input
                      value={r.dismissal}
                      disabled={readOnly || !r.isOut}
                      onChange={(e) => {
                        const updated = [...batRows];
                        updated[i].dismissal = e.target.value;
                        setBatRows(updated);
                      }}
                      placeholder="e.g. c Bowler b Bowler"
                      className="h-8 text-xs"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            </TableBody>
          </Table>
        </div>

        {/* Extras Grid */}
        <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Extras Breakdown (Total: {totalExtras})
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <Label className="text-[11px]">Wides</Label>
              <Input
                type="number"
                min="0"
                value={extras.wides}
                disabled={readOnly}
                onChange={(e) => setExtras({ ...extras, wides: Math.max(0, Number(e.target.value) || 0) })}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">No Balls</Label>
              <Input
                type="number"
                min="0"
                value={extras.noBalls}
                disabled={readOnly}
                onChange={(e) => setExtras({ ...extras, noBalls: Math.max(0, Number(e.target.value) || 0) })}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Byes</Label>
              <Input
                type="number"
                min="0"
                value={extras.byes}
                disabled={readOnly}
                onChange={(e) => setExtras({ ...extras, byes: Math.max(0, Number(e.target.value) || 0) })}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Leg Byes</Label>
              <Input
                type="number"
                min="0"
                value={extras.legByes}
                disabled={readOnly}
                onChange={(e) => setExtras({ ...extras, legByes: Math.max(0, Number(e.target.value) || 0) })}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Penalty Runs</Label>
              <Input
                type="number"
                min="0"
                value={extras.penaltyRuns}
                disabled={readOnly}
                onChange={(e) =>
                  setExtras({ ...extras, penaltyRuns: Math.max(0, Number(e.target.value) || 0) })
                }
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
          </div>
        </div>

        {/* Bowling Table */}
        <div className="rounded-xl border overflow-x-auto shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 text-xs">
                <TableHead className="w-12 text-center">Bowled</TableHead>
                <TableHead>Bowler</TableHead>
                <TableHead className="w-24 text-right">Overs</TableHead>
                <TableHead className="w-20 text-right">Maidens</TableHead>
                <TableHead className="w-20 text-right">Runs</TableHead>
                <TableHead className="w-20 text-right">Wickets</TableHead>
                <TableHead className="w-20 text-right font-bold text-sky-500">Econ</TableHead>
                <TableHead className="w-20 text-right">Wides</TableHead>
                <TableHead className="w-20 text-right">No Balls</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bowlRows.map((r, i) => {
                const economy = r.bowled && r.balls > 0 ? ((r.runs / r.balls) * 6).toFixed(2) : "0.00";
                return (
                  <TableRow key={r.playerId} className="hover:bg-muted/30">
                    <TableCell className="text-center">
                      <Checkbox
                        checked={r.bowled}
                        onCheckedChange={(v) => {
                          const updated = [...bowlRows];
                          updated[i].bowled = !!v;
                          setBowlRows(updated);
                        }}
                        disabled={readOnly}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {r.name}
                      {r.playerId === currentBowlerId && (
                        <Badge className="ml-2 bg-sky-600 text-white text-[9px] py-0 px-1">
                          Bowler 🎯
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-bold text-sm">
                        {ballsToOversText(r.balls)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={r.maidens}
                        disabled={readOnly || !r.bowled}
                        onChange={(e) => {
                          const updated = [...bowlRows];
                          updated[i].maidens = Math.max(0, Number(e.target.value) || 0);
                          setBowlRows(updated);
                        }}
                        className="w-16 h-8 text-right font-mono ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={r.runs}
                        disabled={readOnly || !r.bowled}
                        onChange={(e) => {
                          const updated = [...bowlRows];
                          updated[i].runs = Math.max(0, Number(e.target.value) || 0);
                          setBowlRows(updated);
                        }}
                        className="w-16 h-8 text-right font-mono font-bold ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={r.wickets}
                        disabled={readOnly || !r.bowled}
                        onChange={(e) => {
                          const updated = [...bowlRows];
                          updated[i].wickets = Math.max(0, Number(e.target.value) || 0);
                          setBowlRows(updated);
                        }}
                        className="w-16 h-8 text-right font-mono font-bold text-sky-500 ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                      {economy}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {r.wides}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {r.noBalls}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Wicket Confirmation Dialog */}
      <Dialog open={wicketModalOpen} onOpenChange={setWicketModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500 flex items-center gap-2">
              🔴 Record Fall of Wicket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Dismissed Batsman</Label>
              <Select value={outPlayerId || undefined} onValueChange={setOutPlayerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currentStriker && (
                    <SelectItem value={currentStriker.playerId}>
                      {currentStriker.name} (Striker *)
                    </SelectItem>
                  )}
                  {currentNonStriker && (
                    <SelectItem value={currentNonStriker.playerId}>
                      {currentNonStriker.name} (Non-Striker)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Dismissal Type</Label>
              <Select value={dismissalType} onValueChange={setDismissalType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bowled">Bowled</SelectItem>
                  <SelectItem value="Caught">Caught</SelectItem>
                  <SelectItem value="Run Out">Run Out</SelectItem>
                  <SelectItem value="LBW">LBW</SelectItem>
                  <SelectItem value="Stumped">Stumped</SelectItem>
                  <SelectItem value="Hit Wicket">Hit Wicket</SelectItem>
                  <SelectItem value="Retired Hurt">Retired Hurt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Next Incoming Batsman</Label>
              <Select value={incomingPlayerId || undefined} onValueChange={setIncomingPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select next batsman" />
                </SelectTrigger>
                <SelectContent>
                  {battingPlayers
                    .filter((p) => {
                      const row = batRows.find((b) => b.playerId === p.id);
                      return !row?.batted && p.id !== strikerId && p.id !== nonStrikerId;
                    })
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWicketModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-500 text-white font-bold"
              onClick={confirmWicket}
            >
              Confirm Wicket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No Ball Scoring Dialog (Allows runs scored off bat on No Ball) */}
      <Dialog open={noBallModalOpen} onOpenChange={setNoBallModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-500 flex items-center gap-2 text-base font-bold">
              ⚡ Record No Ball (NB)
            </DialogTitle>
            <CardDescription className="text-xs">
              Striker: <strong>{currentStriker?.name ?? "Striker"}</strong> · Bowler: <strong>{currentBowler?.name ?? "Bowler"}</strong>
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-foreground space-y-1">
              <p className="font-semibold text-amber-500">
                Select runs scored by batsman off the No Ball:
              </p>
              <p className="text-[11px] text-muted-foreground">
                Total Runs = 1 No Ball penalty + runs scored off bat.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-14 flex flex-col gap-0.5 rounded-xl border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => recordNoBall(0)}
              >
                <span className="text-sm font-black text-foreground">0 Runs</span>
                <span className="text-[10px] text-muted-foreground">1 run total (1 Nb)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-14 flex flex-col gap-0.5 rounded-xl border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => recordNoBall(1)}
              >
                <span className="text-sm font-black text-emerald-500">1 Run</span>
                <span className="text-[10px] text-muted-foreground">2 runs (1b+1Nb) 🔄</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-14 flex flex-col gap-0.5 rounded-xl border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => recordNoBall(2)}
              >
                <span className="text-sm font-black text-emerald-500">2 Runs</span>
                <span className="text-[10px] text-muted-foreground">3 runs (2b+1Nb)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-14 flex flex-col gap-0.5 rounded-xl border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => recordNoBall(3)}
              >
                <span className="text-sm font-black text-emerald-500">3 Runs</span>
                <span className="text-[10px] text-muted-foreground">4 runs (3b+1Nb) 🔄</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-14 flex flex-col gap-0.5 rounded-xl border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/15"
                onClick={() => recordNoBall(4)}
              >
                <span className="text-sm font-black text-sky-500">🏏 4 (FOUR)</span>
                <span className="text-[10px] text-muted-foreground">5 runs (4b+1Nb)</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-14 flex flex-col gap-0.5 rounded-xl border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/15"
                onClick={() => recordNoBall(6)}
              >
                <span className="text-sm font-black text-purple-500">🚀 6 (SIX)</span>
                <span className="text-[10px] text-muted-foreground">7 runs (6b+1Nb)</span>
              </Button>
            </div>

            <div className="pt-2 border-t space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                Custom Runs off No Ball:
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={noBallCustomRuns}
                  onChange={(e) => setNoBallCustomRuns(e.target.value)}
                  className="h-9 w-24 text-center font-bold text-sm"
                />
                <Button
                  type="button"
                  className="flex-1 h-9 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                  onClick={() => recordNoBall(Math.max(0, Number(noBallCustomRuns) || 0))}
                >
                  Record {1 + Math.max(0, Number(noBallCustomRuns) || 0)} Runs Total (1 Nb + {Math.max(0, Number(noBallCustomRuns) || 0)} Bat)
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNoBallModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* End of Over - Select Next Bowler Dialog */}
      <Dialog open={nextBowlerModalOpen} onOpenChange={setNextBowlerModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-500 flex items-center gap-2 text-base font-bold">
              <Zap className="h-5 w-5" /> End of Over {completedOverNum} Completed!
            </DialogTitle>
            <CardDescription className="text-xs">
              Score: <strong>{totalRuns}/{totalWickets}</strong> ({completedOverNum}.0 ov). Strike rotated to <strong>{batRows.find(b => b.playerId === strikerId)?.name}</strong>.
            </CardDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-500">
                Next Over: Over {completedOverNum + 1}
              </span>
              <p className="text-xs text-foreground font-semibold">
                Please select the bowler to deliver Over {completedOverNum + 1}:
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">Select Next Bowler</Label>
              <Select value={selectedNextBowlerId} onValueChange={setSelectedNextBowlerId}>
                <SelectTrigger className="h-10 text-xs font-semibold">
                  <SelectValue placeholder="Select next bowler" />
                </SelectTrigger>
                <SelectContent>
                  {bowlingPlayers.map((p) => {
                    const row = bowlRows.find((b) => b.playerId === p.id);
                    const bCount = row?.balls ?? 0;
                    const isExhausted = isBowlerQuotaExhausted(p.id);
                    const maxB = getBowlerMaxBalls(p.id);
                    const isConsecutive = p.id === lastOverBowlerId;

                    return (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        disabled={isExhausted || isConsecutive}
                      >
                        {p.name} ({ballsToOversText(bCount)} / {ballsToOversText(maxB)} ov)
                        {isConsecutive
                          ? " [Cannot bowl consecutive overs]"
                          : isExhausted
                            ? " [Quota Completed]"
                            : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
              💡 <em>Once confirmed, all upcoming deliveries will automatically be added to this bowler's figures.</em>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5"
              onClick={handleConfirmNextBowler}
              disabled={!selectedNextBowlerId}
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm Bowler for Over {completedOverNum + 1}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Complete Match Card
// ---------------------------------------------------------------------------

function CompleteMatchCard({
  match,
  teams,
  players,
  pending,
  onComplete,
}: {
  match: Match;
  teams: Team[];
  players: Player[];
  pending: boolean;
  onComplete: (playerOfMatchId?: string) => void;
}) {
  const [pom, setPom] = useState<string>("");

  // Only players from the two competing teams in this match
  const matchPlayers = useMemo(
    () =>
      players.filter(
        (p) => p.teamId === match.teamAId || p.teamId === match.teamBId,
      ),
    [players, match.teamAId, match.teamBId],
  );

  const teamNameOf = (teamId?: string | null) =>
    teams.find((t) => t.id === teamId)?.shortName ?? "Team";

  return (
    <Card className="border-emerald-500/40 bg-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-emerald-500 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" /> Declare Match Complete & Finalize Results
        </CardTitle>
        <CardDescription className="text-xs">
          This finalizes the winning team, NRR calculations, and points table standing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5 min-w-[280px]">
          <Label className="text-xs font-semibold">Player of the Match (Optional)</Label>
          <div className="flex items-center gap-2">
            {pom && (
              <PlayerAvatar
                name={matchPlayers.find((p) => p.id === pom)?.name ?? "Player"}
                photoUrl={matchPlayers.find((p) => p.id === pom)?.photoUrl}
                size="sm"
                className="ring-1 ring-amber-400"
              />
            )}
            <Select value={pom || undefined} onValueChange={setPom}>
              <SelectTrigger className="h-10 text-xs flex-1">
                <SelectValue placeholder="Select player from playing teams" />
              </SelectTrigger>
              <SelectContent>
                {matchPlayers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({teamNameOf(p.teamId)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
          disabled={pending}
          onClick={() => onComplete(pom || undefined)}
        >
          <Award className="h-4 w-4" /> Declare Winner & Finalize Match
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Playing VI Editor (6 Starters + 1 Reserve)
// ---------------------------------------------------------------------------

function PlayingVIEditor({
  match,
  teams,
  players,
  onSaved,
}: {
  match: Match;
  teams: Team[];
  players: Player[];
  onSaved: () => void;
}) {
  const teamA = teams.find((t) => t.id === match.teamAId);
  const teamB = teams.find((t) => t.id === match.teamBId);

  const teamAPlayers = players.filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = players.filter((p) => p.teamId === match.teamBId);

  // Lineup state for Team A
  const [teamAPlayingVI, setTeamAPlayingVI] = useState<string[]>(() => {
    if (match.teamAPlayingVI && match.teamAPlayingVI.length > 0) return match.teamAPlayingVI;
    return teamAPlayers.slice(0, 6).map((p) => p.id);
  });
  const [teamAReserveId, setTeamAReserveId] = useState<string>(() => {
    if (match.teamAReserveId) return match.teamAReserveId;
    return teamAPlayers[6]?.id ?? "";
  });

  // Lineup state for Team B
  const [teamBPlayingVI, setTeamBPlayingVI] = useState<string[]>(() => {
    if (match.teamBPlayingVI && match.teamBPlayingVI.length > 0) return match.teamBPlayingVI;
    return teamBPlayers.slice(0, 6).map((p) => p.id);
  });
  const [teamBReserveId, setTeamBReserveId] = useState<string>(() => {
    if (match.teamBReserveId) return match.teamBReserveId;
    return teamBPlayers[6]?.id ?? "";
  });

  const saveLineup = useMutation({
    mutationFn: () =>
      fbUpdateMatchLineups({
        matchId: match.id,
        teamAPlayingVI,
        teamAReserveId: teamAReserveId || null,
        teamBPlayingVI,
        teamBReserveId: teamBReserveId || null,
      }),
    onSuccess: () => {
      toast.success("Match Playing VI & Reserve Lineups saved!");
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const togglePlayerA = (id: string) => {
    if (teamAPlayingVI.includes(id)) {
      setTeamAPlayingVI(teamAPlayingVI.filter((p) => p !== id));
    } else {
      if (teamAPlayingVI.length >= 6) {
        toast.error("Playing squad is limited to 6 starting players (Indoor format).");
        return;
      }
      setTeamAPlayingVI([...teamAPlayingVI, id]);
      if (teamAReserveId === id) setTeamAReserveId("");
    }
  };

  const togglePlayerB = (id: string) => {
    if (teamBPlayingVI.includes(id)) {
      setTeamBPlayingVI(teamBPlayingVI.filter((p) => p !== id));
    } else {
      if (teamBPlayingVI.length >= 6) {
        toast.error("Playing squad is limited to 6 starting players (Indoor format).");
        return;
      }
      setTeamBPlayingVI([...teamBPlayingVI, id]);
      if (teamBReserveId === id) setTeamBReserveId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" /> 6-a-side Match Lineups (6 Playing + 1 Reserve)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select the 6 active on-field players and 1 reserve/bench player for each team.
          </p>
        </div>
        <Button
          onClick={() => saveLineup.mutate()}
          disabled={saveLineup.isPending}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
        >
          Save & Publish Lineups
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Team A Lineup Selector */}
        <Card className="border shadow-sm">
          <CardHeader className="p-4 pb-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TeamBadge shortName={teamA?.shortName ?? "TBD"} logoUrl={teamA?.logoUrl} size="sm" />
                <CardTitle className="text-sm font-bold">{teamA?.name ?? "Team A"}</CardTitle>
              </div>
              <Badge
                variant={teamAPlayingVI.length === 6 ? "default" : "outline"}
                className={teamAPlayingVI.length === 6 ? "bg-emerald-600 text-white" : "border-amber-500 text-amber-500"}
              >
                {teamAPlayingVI.length}/6 Selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select 6 Starting Players:
              </span>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {teamAPlayers.map((p) => {
                  const isSelected = teamAPlayingVI.includes(p.id);
                  const isReserve = teamAReserveId === p.id;

                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePlayerA(p.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500/40 text-foreground font-semibold"
                          : "hover:bg-muted/40 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox checked={isSelected} />
                        <span>{p.name}</span>
                        {(p.isCaptain || p.designation === "Captain") && (
                          <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">(C)</Badge>
                        )}
                        {(p.isViceCaptain || p.designation === "Vice Captain") && (
                          <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold">(VC)</Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{p.role}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team A Reserve Selector */}
            <div className="pt-3 border-t space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Select 1 Reserve Player:
              </Label>
              <Select value={teamAReserveId} onValueChange={setTeamAReserveId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select 1 Reserve Player" />
                </SelectTrigger>
                <SelectContent>
                  {teamAPlayers
                    .filter((p) => !teamAPlayingVI.includes(p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Team B Lineup Selector */}
        <Card className="border shadow-sm">
          <CardHeader className="p-4 pb-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TeamBadge shortName={teamB?.shortName ?? "TBD"} logoUrl={teamB?.logoUrl} size="sm" />
                <CardTitle className="text-sm font-bold">{teamB?.name ?? "Team B"}</CardTitle>
              </div>
              <Badge
                variant={teamBPlayingVI.length === 6 ? "default" : "outline"}
                className={teamBPlayingVI.length === 6 ? "bg-emerald-600 text-white" : "border-amber-500 text-amber-500"}
              >
                {teamBPlayingVI.length}/6 Selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select 6 Starting Players:
              </span>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {teamBPlayers.map((p) => {
                  const isSelected = teamBPlayingVI.includes(p.id);
                  const isReserve = teamBReserveId === p.id;

                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePlayerB(p.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500/40 text-foreground font-semibold"
                          : "hover:bg-muted/40 border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox checked={isSelected} />
                        <span>{p.name}</span>
                        {(p.isCaptain || p.designation === "Captain") && (
                          <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">(C)</Badge>
                        )}
                        {(p.isViceCaptain || p.designation === "Vice Captain") && (
                          <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold">(VC)</Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{p.role}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team B Reserve Selector */}
            <div className="pt-3 border-t space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Select 1 Reserve Player:
              </Label>
              <Select value={teamBReserveId} onValueChange={setTeamBReserveId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select 1 Reserve Player" />
                </SelectTrigger>
                <SelectContent>
                  {teamBPlayers
                    .filter((p) => !teamBPlayingVI.includes(p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
