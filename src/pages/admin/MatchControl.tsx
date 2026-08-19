import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getMatchWorkspace } from "@/lib/queries";
import {
  startMatch as fbStartMatch,
  completeMatch as fbCompleteMatch,
  reopenMatch as fbReopenMatch,
  saveInnings as fbSaveInnings,
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

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const { match, teams, players, innings } = data;
  const teamA = teams.find((t) => t.id === match.teamAId);
  const teamB = teams.find((t) => t.id === match.teamBId);
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
          teamA={teamA}
          teamB={teamB}
          pending={startMatch.isPending}
          onStart={(tossWinnerId, tossDecision) =>
            startMatch.mutate({ tossWinnerId, tossDecision })
          }
        />
      )}

      {match.status === "UPCOMING" && (!teamA || !teamB) && (
        <Card className="border-dashed p-8 text-center text-muted-foreground">
          Teams are not set for this fixture yet. Populate teams in the Schedule tab first.
        </Card>
      )}

      {/* Live Innings Scoring Workspace */}
      {(canEnterScores || match.status === "COMPLETED") && (inn1 || canEnterScores) && (
        <Tabs defaultValue={inn2 ? "2" : "1"} className="w-full">
          <div className="flex items-center justify-between border-b pb-2">
            <TabsList className="grid w-72 grid-cols-2">
              <TabsTrigger value="1" className="text-xs font-bold">
                1st Innings {inn1 ? `(${inn1.runs}/${inn1.wickets})` : ""}
              </TabsTrigger>
              <TabsTrigger value="2" disabled={!inn1 && canEnterScores} className="text-xs font-bold">
                2nd Innings {inn2 ? `(${inn2.runs}/${inn2.wickets})` : ""}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="1" className="mt-4">
            <InningsLiveConsole
              key={`i1-${inn1?.id ?? "new"}-${match.status}`}
              matchId={match.id}
              inningsNumber={1}
              workspace={data}
              readOnly={!canEnterScores}
              onSaved={() => {
                refetch();
                invalidate();
              }}
            />
          </TabsContent>

          <TabsContent value="2" className="mt-4">
            {inn1 ? (
              <InningsLiveConsole
                key={`i2-${inn2?.id ?? "new"}-${match.status}`}
                matchId={match.id}
                inningsNumber={2}
                workspace={data}
                readOnly={!canEnterScores}
                onSaved={() => {
                  refetch();
                  invalidate();
                }}
              />
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">
                Please complete and save the 1st Innings first.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Complete Match & Declare Winner */}
      {canEnterScores && inn1 && (
        <CompleteMatchCard
          players={players}
          pending={completeMatch.isPending}
          onComplete={(playerOfMatchId) => {
            if (confirm("Declare match complete? The winner and points table will be finalized."))
              completeMatch.mutate({ playerOfMatchId });
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Start Match / Toss Card
// ---------------------------------------------------------------------------

function StartMatchCard({
  teamA,
  teamB,
  pending,
  onStart,
}: {
  teamA: Team;
  teamB: Team;
  pending: boolean;
  onStart: (tossWinnerId: string, decision: "BAT" | "BOWL") => void;
}) {
  const [tossWinner, setTossWinner] = useState<string>("");
  const [decision, setDecision] = useState<"BAT" | "BOWL">("BAT");

  return (
    <Card className="border-emerald-500/30 bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-500" /> Conduct Toss & Start Live Match
        </CardTitle>
        <CardDescription className="text-xs">
          Select which team won the toss and their election to begin live ball-by-ball scoring.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-2 min-w-[200px]">
          <Label className="text-xs font-semibold">Toss Won By</Label>
          <Select value={tossWinner} onValueChange={setTossWinner}>
            <SelectTrigger>
              <SelectValue placeholder="Select team" />
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

        <div className="space-y-2 min-w-[160px]">
          <Label className="text-xs font-semibold">Elected To</Label>
          <Select value={decision} onValueChange={(v) => setDecision(v as "BAT" | "BOWL")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BAT">🏏 Bat First</SelectItem>
              <SelectItem value="BOWL">🎯 Bowl First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          disabled={pending || !tossWinner}
          onClick={() => onStart(tossWinner, decision)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
        >
          <Zap className="h-4 w-4" /> Start Live Scoring
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

  // ICC Live Active Batsmen & Bowler Selection
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
    const bowlerObj = newBowl.find((b) => b.playerId === currentBowlerId);
    const bowlerBalls = bowlerObj?.balls ?? 0;
    const isOverEnd = bowlerBalls % 6 === 0;

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
      toast.info(`Over completed (${Math.floor(bowlerBalls / 6)} ov). Strike rotated.`);
    }

    setStrikerId(nextStriker);
    setNonStrikerId(nextNonStriker);
    setBatRows(newBat);
    setBowlRows(newBowl);
    setRecentBalls((prev) => [...prev.slice(-11), runsScored === 0 ? "•" : runsScored.toString()]);

    triggerSave(newBat, newBowl, extras);
  };

  // Record Extras (Wide, No Ball, Bye, Leg Bye)
  const recordExtra = (type: "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE", extraRuns = 1) => {
    if (!currentBowlerId) {
      toast.error("Please select the Current Bowler.");
      return;
    }

    pushHistory();

    const newExtras = { ...extras };
    let newBowl = [...bowlRows];
    let newBat = [...batRows];

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
      newExtras.byes += extraRuns;
      newBowl = newBowl.map((b) =>
        b.playerId === currentBowlerId ? { ...b, bowled: true, balls: b.balls + 1 } : b,
      );
      newBat = newBat.map((b) =>
        b.playerId === strikerId ? { ...b, batted: true, balls: b.balls + 1 } : b,
      );
      setRecentBalls((prev) => [...prev.slice(-11), `${extraRuns}B`]);
    } else if (type === "LEG_BYE") {
      newExtras.legByes += extraRuns;
      newBowl = newBowl.map((b) =>
        b.playerId === currentBowlerId ? { ...b, bowled: true, balls: b.balls + 1 } : b,
      );
      newBat = newBat.map((b) =>
        b.playerId === strikerId ? { ...b, batted: true, balls: b.balls + 1 } : b,
      );
      setRecentBalls((prev) => [...prev.slice(-11), `${extraRuns}Lb`]);
    }

    setExtras(newExtras);
    setBowlRows(newBowl);
    setBatRows(newBat);

    triggerSave(newBat, newBowl, newExtras);
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

    // Replace out batsman with incoming batsman
    if (outPlayerId === strikerId) {
      setStrikerId(incomingPlayerId);
    } else {
      setNonStrikerId(incomingPlayerId);
    }

    setBatRows(newBat);
    setBowlRows(newBowl);
    setRecentBalls((prev) => [...prev.slice(-11), "W"]);
    setWicketModalOpen(false);

    triggerSave(newBat, newBowl, extras);
    toast.success(`Wicket recorded (${dismissalType})!`);
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
                  ({ballsToOversText(totalLegalBalls)} / {match.oversPerSide ?? 10} ov)
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
                      {Math.max(0, (match.oversPerSide ?? 10) * 6 - totalLegalBalls)}
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
                  {currentBowler && (
                    <span className="text-xs font-mono font-bold text-sky-500">
                      {ballsToOversText(currentBowler.balls)} ov · {currentBowler.runs}r ·{" "}
                      {currentBowler.wickets}w
                    </span>
                  )}
                </div>
                <Select value={currentBowlerId} onValueChange={setCurrentBowlerId}>
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue placeholder="Select Bowler" />
                  </SelectTrigger>
                  <SelectContent>
                    {bowlingPlayers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
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
                <TableHead className="w-20 text-center">Out?</TableHead>
                <TableHead>Dismissal Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batRows.map((r, i) => (
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
                      value={r.runs}
                      disabled={readOnly || !r.batted}
                      onChange={(e) => {
                        const updated = [...batRows];
                        updated[i].runs = Number(e.target.value) || 0;
                        setBatRows(updated);
                      }}
                      className="w-16 h-8 text-right font-mono font-bold ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={r.balls}
                      disabled={readOnly || !r.batted}
                      onChange={(e) => {
                        const updated = [...batRows];
                        updated[i].balls = Number(e.target.value) || 0;
                        setBatRows(updated);
                      }}
                      className="w-16 h-8 text-right font-mono ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={r.fours}
                      disabled={readOnly || !r.batted}
                      onChange={(e) => {
                        const updated = [...batRows];
                        updated[i].fours = Number(e.target.value) || 0;
                        setBatRows(updated);
                      }}
                      className="w-14 h-8 text-right font-mono ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={r.sixes}
                      disabled={readOnly || !r.batted}
                      onChange={(e) => {
                        const updated = [...batRows];
                        updated[i].sixes = Number(e.target.value) || 0;
                        setBatRows(updated);
                      }}
                      className="w-14 h-8 text-right font-mono ml-auto"
                    />
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
              ))}
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
                value={extras.wides}
                disabled={readOnly}
                onChange={(e) => setExtras({ ...extras, wides: Number(e.target.value) || 0 })}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">No Balls</Label>
              <Input
                type="number"
                value={extras.noBalls}
                disabled={readOnly}
                onChange={(e) => setExtras({ ...extras, noBalls: Number(e.target.value) || 0 })}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Byes</Label>
              <Input
                type="number"
                value={extras.byes}
                disabled={readOnly}
                onChange={(e) => setExtras({ ...extras, byes: Number(e.target.value) || 0 })}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Leg Byes</Label>
              <Input
                type="number"
                value={extras.legByes}
                disabled={readOnly}
                onChange={(e) => setExtras({ ...extras, legByes: Number(e.target.value) || 0 })}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[11px]">Penalty Runs</Label>
              <Input
                type="number"
                value={extras.penaltyRuns}
                disabled={readOnly}
                onChange={(e) =>
                  setExtras({ ...extras, penaltyRuns: Number(e.target.value) || 0 })
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
                <TableHead className="w-20 text-right">Wides</TableHead>
                <TableHead className="w-20 text-right">No Balls</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bowlRows.map((r, i) => (
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
                      value={r.maidens}
                      disabled={readOnly || !r.bowled}
                      onChange={(e) => {
                        const updated = [...bowlRows];
                        updated[i].maidens = Number(e.target.value) || 0;
                        setBowlRows(updated);
                      }}
                      className="w-16 h-8 text-right font-mono ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={r.runs}
                      disabled={readOnly || !r.bowled}
                      onChange={(e) => {
                        const updated = [...bowlRows];
                        updated[i].runs = Number(e.target.value) || 0;
                        setBowlRows(updated);
                      }}
                      className="w-16 h-8 text-right font-mono font-bold ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={r.wickets}
                      disabled={readOnly || !r.bowled}
                      onChange={(e) => {
                        const updated = [...bowlRows];
                        updated[i].wickets = Number(e.target.value) || 0;
                        setBowlRows(updated);
                      }}
                      className="w-16 h-8 text-right font-mono font-bold text-sky-500 ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {r.wides}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {r.noBalls}
                  </TableCell>
                </TableRow>
              ))}
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
