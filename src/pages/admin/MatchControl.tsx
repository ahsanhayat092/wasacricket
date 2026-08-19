import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getMatchWorkspace } from "@/lib/queries";
import {
  startMatch as fbStartMatch,
  completeMatch as fbCompleteMatch,
  reopenMatch as fbReopenMatch,
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
import { statusBadgeClass, oversToBalls, ballsToOversText, type MatchStatus } from "@/lib/cricket";
import { toast } from "sonner";
import {
  ArrowLeft,
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
import type { Match, Team, Player, Innings, BattingScore, BowlingScore } from "@/lib/firestore";

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
  const inn1 = innings.find((i) => i.inningsNumber === 1);
  const inn2 = innings.find((i) => i.inningsNumber === 2);
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
              {match.day} · {match.venue ?? "Askari XI, Lahore"} · {match.oversPerSide ?? 10} Overs Match
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/live/${match.id}`} target="_blank">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-emerald-500/40 text-emerald-500">
              <Zap className="h-3.5 w-3.5" /> View Live Public Screen
            </Button>
          </Link>
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
          <Tabs defaultValue={inn2 ? "2" : "1"} className="w-full">
            <div className="flex items-center justify-between border-b pb-2">
              <TabsList className="grid w-72 grid-cols-2">
                <TabsTrigger value="1" className="text-xs font-bold">
                  1st Innings {inn1 ? `(${inn1.runs}/${inn1.wickets})` : ""}
                </TabsTrigger>
                <TabsTrigger value="2" className="text-xs font-bold">
                  2nd Innings {inn2 ? `(${inn2.runs}/${inn2.wickets})` : ""}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="1" className="mt-4">
              <InningsLiveConsole
                key={`innings-${match.id}-1`}
                matchId={match.id}
                inningsNumber={1}
                workspace={data}
                readOnly={false}
                onSaved={() => {
                  refetch();
                  invalidate();
                }}
              />
            </TabsContent>

            <TabsContent value="2" className="mt-4">
              <InningsLiveConsole
                key={`innings-${match.id}-2`}
                matchId={match.id}
                inningsNumber={2}
                workspace={data}
                readOnly={false}
                onSaved={() => {
                  refetch();
                  invalidate();
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Complete Match & Declare Winner */}
          {(inn1 || inn2) && (
            <CompleteMatchCard
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
            <Select value={tossWinner} onValueChange={setTossWinner}>
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
                <Select value={teamAReserveId} onValueChange={setTeamAReserveId}>
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
                <Select value={teamBReserveId} onValueChange={setTeamBReserveId}>
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
}: {
  matchId: string;
  inningsNumber: 1 | 2;
  workspace: WorkspaceData;
  readOnly: boolean;
  onSaved: () => void;
}) {
  const { innings, players, teams, match } = workspace;
  const existing = innings.find((i) => i.inningsNumber === inningsNumber);
  const inn1 = innings.find((i) => i.inningsNumber === 1);

  // Determine Batting & Bowling Teams
  let battingTeamId: string | null = existing?.battingTeamId ?? null;
  let bowlingTeamId: string | null = existing?.bowlingTeamId ?? null;

  if (!battingTeamId && inningsNumber === 2 && inn1) {
    battingTeamId = inn1.bowlingTeamId;
    bowlingTeamId = inn1.battingTeamId;
  }
  if (!battingTeamId && inningsNumber === 1) {
    if (match.tossWinnerId && match.tossDecision) {
      battingTeamId =
        match.tossDecision === "BAT"
          ? match.tossWinnerId
          : match.tossWinnerId === match.teamAId
            ? match.teamBId
            : match.teamAId;
      bowlingTeamId = battingTeamId === match.teamAId ? match.teamBId : match.teamAId;
    } else {
      battingTeamId = match.teamAId ?? null;
      bowlingTeamId = match.teamBId ?? null;
    }
  }

  const battingPlayers = players.filter((p) => p.teamId === battingTeamId);
  const bowlingPlayers = players.filter((p) => p.teamId === bowlingTeamId);
  const battingTeam = teams.find((t) => t.id === battingTeamId);
  const bowlingTeam = teams.find((t) => t.id === bowlingTeamId);

  // Batting and Bowling State
  const [batRows, setBatRows] = useState<BatRow[]>(() =>
    battingPlayers.map((p) => {
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
    }),
  );

  const [bowlRows, setBowlRows] = useState<BowlRow[]>(() =>
    bowlingPlayers.map((p) => {
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
    }),
  );

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
    const activeBowlers = bowlRows.filter((b) => b.bowled);
    return activeBowlers[activeBowlers.length - 1]?.playerId ?? bowlingPlayers[0]?.id ?? "";
  });

  // Auto-select initial batsmen and bowler if not yet selected
  useEffect(() => {
    if (!strikerId && battingPlayers.length > 0) {
      const notOut = batRows.filter((b) => b.batted && !b.isOut);
      setStrikerId(notOut[0]?.playerId ?? battingPlayers[0]?.id ?? "");
    }
    if (!nonStrikerId && battingPlayers.length > 1) {
      const notOut = batRows.filter((b) => b.batted && !b.isOut);
      setNonStrikerId(notOut[1]?.playerId ?? battingPlayers[1]?.id ?? "");
    }
    if (!currentBowlerId && bowlingPlayers.length > 0) {
      const activeBowlers = bowlRows.filter((b) => b.bowled);
      setCurrentBowlerId(activeBowlers[activeBowlers.length - 1]?.playerId ?? bowlingPlayers[0]?.id ?? "");
    }
  }, [battingPlayers, bowlingPlayers, batRows, bowlRows, strikerId, nonStrikerId, currentBowlerId]);

  // Recent Balls Feed (History for this session)
  const [recentBalls, setRecentBalls] = useState<string[]>([]);
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

  // End of Over - Next Bowler Selection Modal State
  const [nextBowlerModalOpen, setNextBowlerModalOpen] = useState(false);
  const [completedOverNum, setCompletedOverNum] = useState<number>(1);
  const [selectedNextBowlerId, setSelectedNextBowlerId] = useState<string>("");

  // Trigger Next Bowler Selection Dialog on Over Completion or Quota Reached
  const triggerNextBowlerDialog = (newTotalBalls: number, previousBowlerId: string) => {
    if (newTotalBalls >= maxLegalBallsInnings) return; // Innings already finished
    const overNum = Math.floor(newTotalBalls / 6);
    setCompletedOverNum(Math.max(1, overNum));
    // Auto-find next eligible bowler other than the previous one
    const nextEligible =
      bowlingPlayers.find((p) => p.id !== previousBowlerId && !isBowlerQuotaExhausted(p.id)) ??
      bowlingPlayers.find((p) => !isBowlerQuotaExhausted(p.id));
    setSelectedNextBowlerId(nextEligible?.id ?? "");
    setNextBowlerModalOpen(true);
  };

  const handleConfirmNextBowler = () => {
    if (!selectedNextBowlerId) {
      toast.error("Please select the next bowler.");
      return;
    }
    setCurrentBowlerId(selectedNextBowlerId);
    setBowlRows((prev) =>
      prev.map((b) => (b.playerId === selectedNextBowlerId ? { ...b, bowled: true } : b)),
    );
    setNextBowlerModalOpen(false);
    const bName = bowlingPlayers.find((p) => p.id === selectedNextBowlerId)?.name ?? "Bowler";
    toast.success(`Bowler set to ${bName}! Balls will now count towards them.`);
  };

  // Calculated Totals
  const totalBatterRuns = useMemo(
    () => batRows.filter((b) => b.batted).reduce((s, b) => s + b.runs, 0),
    [batRows],
  );

  const totalExtras =
    extras.wides + extras.noBalls + extras.byes + extras.legByes + extras.penaltyRuns;

  const totalRuns = totalBatterRuns + totalExtras;
  const totalWickets = batRows.filter((b) => b.batted && b.isOut).length;

  const totalLegalBalls = useMemo(
    () => bowlRows.filter((b) => b.bowled).reduce((s, b) => s + b.balls, 0),
    [bowlRows],
  );

  const currentStriker = batRows.find((b) => b.playerId === strikerId);
  const currentNonStriker = batRows.find((b) => b.playerId === nonStrikerId);
  const currentBowler = bowlRows.find((b) => b.playerId === currentBowlerId);

  // Save Mutation
  const save = useMutation({
    mutationFn: (args: Parameters<typeof fbSaveInnings>[0]) => fbSaveInnings(args),
    onSuccess: (r) => {
      toast.success(
        `Scoreboard updated: ${r.runs}/${r.wickets} (${ballsToOversText(r.balls)} ov)`,
      );
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
      .filter((r) => r.bowled)
      .map((r) => ({
        playerId: r.playerId,
        balls: r.balls,
        maidens: r.maidens,
        runs: r.runs,
        wickets: r.wickets,
        wides: r.wides,
        noBalls: r.noBalls,
      }));

    save.mutate({
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
    });
  };

  const isFinal = match.stage === "FINAL";
  const maxMatchOvers = isFinal ? 5 : (match.oversPerSide ?? 4);
  const maxLegalBallsInnings = maxMatchOvers * 6;

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
    if (!strikerId || !currentBowlerId) {
      toast.error("Please select both Striker and Bowler first.");
      return;
    }

    if (totalLegalBalls >= maxLegalBallsInnings) {
      toast.error(
        `Innings limit reached (${maxMatchOvers} overs). Please complete the innings.`,
      );
      return;
    }

    if (isBowlerQuotaExhausted(currentBowlerId)) {
      toast.info("Over completed! Please select the bowler for the next over.");
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
    setRecentBalls((prev) => [...prev.slice(-11), runsScored === 0 ? "•" : runsScored.toString()]);

    triggerSave(newBat, newBowl, extras);

    if (isOverEnd) {
      triggerNextBowlerDialog(newTotalBalls, currentBowlerId);
    }
  };

  // Record Extras (Wide, No Ball, Bye, Leg Bye)
  const recordExtra = (type: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE", extraRuns = 1) => {
    if (!currentBowlerId) {
      toast.error("Please select the Current Bowler.");
      return;
    }

    if (isBowlerQuotaExhausted(currentBowlerId)) {
      toast.info("Over completed! Please select the bowler for the next over.");
      triggerNextBowlerDialog(totalLegalBalls, currentBowlerId);
      return;
    }

    pushHistory();

    const newExtras = { ...extras };
    let newBowl = [...bowlRows];
    let newBat = [...batRows];
    let isOverEnd = false;
    let newTotalBalls = totalLegalBalls;

    if (type === "WIDE") {
      newExtras.wides += extraRuns;
      newBowl = newBowl.map((b) =>
        b.playerId === currentBowlerId
          ? { ...b, bowled: true, runs: b.runs + extraRuns, wides: b.wides + extraRuns }
          : b,
      );
      setRecentBalls((prev) => [...prev.slice(-11), extraRuns > 1 ? `${extraRuns}Wd` : "Wd"]);
    } else if (type === "NO_BALL") {
      newExtras.noBalls += extraRuns;
      newBowl = newBowl.map((b) =>
        b.playerId === currentBowlerId
          ? { ...b, bowled: true, runs: b.runs + extraRuns, noBalls: b.noBalls + 1 }
          : b,
      );
      setRecentBalls((prev) => [...prev.slice(-11), extraRuns > 1 ? `${extraRuns}Nb` : "Nb"]);
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
      setRecentBalls((prev) => [...prev.slice(-11), `${extraRuns}B`]);
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
      setRecentBalls((prev) => [...prev.slice(-11), `${extraRuns}Lb`]);
    }

    if (isOverEnd) {
      const temp = strikerId;
      setStrikerId(nonStrikerId);
      setNonStrikerId(temp);
    }

    setExtras(newExtras);
    setBowlRows(newBowl);
    setBatRows(newBat);

    triggerSave(newBat, newBowl, newExtras);

    if (isOverEnd) {
      triggerNextBowlerDialog(newTotalBalls, currentBowlerId);
    }
  };

  // Open Wicket Popup
  const promptWicket = () => {
    setOutPlayerId(strikerId);
    const unbatted = batRows.filter((b) => !b.batted);
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
    setRecentBalls((prev) => [...prev.slice(-11), "W"]);
    setWicketModalOpen(false);

    triggerSave(newBat, newBowl, extras);
    toast.success(`Wicket recorded (${dismissalType})!`);

    if (isOverEnd) {
      triggerNextBowlerDialog(newTotalBalls, currentBowlerId);
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

            {/* Over Wheel / Recent Balls Badges */}
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                Recent Deliveries
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {recentBalls.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    Ready for first delivery…
                  </span>
                ) : (
                  recentBalls.map((b, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center justify-center h-7 min-w-7 px-1.5 rounded-lg font-mono font-bold text-xs shadow-sm ${
                        b === "4"
                          ? "bg-amber-500 text-slate-950"
                          : b === "6"
                            ? "bg-emerald-500 text-slate-950 font-black"
                            : b === "W"
                              ? "bg-red-600 text-white font-black animate-pulse"
                              : b.includes("Wd") || b.includes("Nb")
                                ? "bg-indigo-600 text-white"
                                : "bg-muted text-foreground"
                      }`}
                    >
                      {b}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning if squad players are missing */}
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
                <Select value={strikerId} onValueChange={setStrikerId}>
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
                <Select value={nonStrikerId} onValueChange={setNonStrikerId}>
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
                <Select value={currentBowlerId} onValueChange={setCurrentBowlerId}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue placeholder="Select Bowler" />
                  </SelectTrigger>
                  <SelectContent>
                    {bowlingPlayers.map((p) => {
                      const row = bowlRows.find((b) => b.playerId === p.id);
                      const bCount = row?.balls ?? 0;
                      const isExhausted = isBowlerQuotaExhausted(p.id);
                      const maxB = getBowlerMaxBalls(p.id);

                      return (
                        <SelectItem key={p.id} value={p.id} disabled={isExhausted}>
                          {p.name} ({ballsToOversText(bCount)} / {ballsToOversText(maxB)} ov)
                          {isExhausted ? " [LIMIT REACHED]" : ""}
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 font-bold text-xs bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400 rounded-xl"
                    onClick={() => recordExtra("WIDE", 1)}
                  >
                    +1 Wide (Wd)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 font-bold text-xs bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400 rounded-xl"
                    onClick={() => recordExtra("NO_BALL", 1)}
                  >
                    +1 No Ball (Nb)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 font-bold text-xs rounded-xl"
                    onClick={() => recordExtra("BYE", 1)}
                  >
                    +1 Bye
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 font-bold text-xs rounded-xl"
                    onClick={() => recordExtra("LEG_BYE", 1)}
                  >
                    +1 Leg Bye
                  </Button>
                  <Button
                    type="button"
                    className="h-12 font-black text-sm bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md col-span-2 sm:col-span-1"
                    onClick={promptWicket}
                  >
                    🔴 WICKET (OUT)
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
                      {r.name}
                      {r.playerId === strikerId && (
                        <Badge className="ml-2 bg-amber-600 text-white text-[9px] py-0 px-1">
                          Striker *
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
              <Select value={outPlayerId} onValueChange={setOutPlayerId}>
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
              <Select value={incomingPlayerId} onValueChange={setIncomingPlayerId}>
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
                    const isPrevious = p.id === currentBowlerId;

                    return (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        disabled={isExhausted || isPrevious}
                      >
                        {p.name} ({ballsToOversText(bCount)} / {ballsToOversText(maxB)} ov)
                        {isPrevious ? " [Just Bowled]" : isExhausted ? " [Quota Completed]" : ""}
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
  players,
  pending,
  onComplete,
}: {
  players: Player[];
  pending: boolean;
  onComplete: (playerOfMatchId?: string) => void;
}) {
  const [pom, setPom] = useState<string>("");

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
        <div className="space-y-1.5 min-w-[240px]">
          <Label className="text-xs font-semibold">Player of the Match (Optional)</Label>
          <Select value={pom} onValueChange={setPom}>
            <SelectTrigger>
              <SelectValue placeholder="Select player" />
            </SelectTrigger>
            <SelectContent>
              {players.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
