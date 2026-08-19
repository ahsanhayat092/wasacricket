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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusBadgeClass, oversToBalls, ballsToOversText, type MatchStatus } from "@/lib/cricket";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
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
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["matchWorkspace", id] });
    queryClient.invalidateQueries({ queryKey: ["schedule"] });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
  };

  const startMatch = useMutation({
    mutationFn: (args: { tossWinnerId: string; tossDecision: "BAT" | "BOWL" }) =>
      fbStartMatch({ matchId: id!, ...args }),
    onSuccess: () => { toast.success("Match started — status LIVE"); refetch(); invalidate(); },
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
    onSuccess: () => { toast.success("Match reopened for correction"); refetch(); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const { match, teams, players, innings } = data;
  const teamA = teams.find((t) => t.id === match.teamAId);
  const teamB = teams.find((t) => t.id === match.teamBId);
  const inn1 = innings.find((i) => i.inningsNumber === 1);
  const canEnterScores = match.status === "LIVE";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/admin/matches">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {match.stage === "FINAL" ? "🏆 Final" : `Match ${match.matchNumber}`}:{" "}
            {teamA?.name ?? "Rank 1"} vs {teamB?.name ?? "Rank 2"}
          </h1>
          <p className="text-sm text-muted-foreground">{match.day}</p>
        </div>
        <Badge variant="outline" className={statusBadgeClass(match.status as MatchStatus)}>
          {match.status.replace("_", " ")}
        </Badge>
      </div>

      {match.resultText && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold text-emerald-500">{match.resultText}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={reopen.isPending}
              onClick={() => {
                if (confirm("Reopen this match for correction? Standings will be recalculated."))
                  reopen.mutate();
              }}
            >
              Reopen for correction
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Start match */}
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
        <p className="text-muted-foreground">
          Teams are not set yet. They will be populated automatically once the
          league stage completes, or set them in Schedule.
        </p>
      )}

      {/* Scorecard entry */}
      {(canEnterScores || match.status === "COMPLETED") && (inn1 || canEnterScores) && (
        <Tabs defaultValue="1">
          <TabsList>
            <TabsTrigger value="1">Innings 1</TabsTrigger>
            <TabsTrigger value="2" disabled={!inn1 && canEnterScores}>
              Innings 2
            </TabsTrigger>
          </TabsList>
          <TabsContent value="1" className="mt-4">
            <InningsEditor
              key={`i1-${inn1?.id ?? "new"}-${match.status}`}
              matchId={match.id}
              inningsNumber={1}
              workspace={data}
              readOnly={!canEnterScores}
              onSaved={() => { refetch(); invalidate(); }}
            />
          </TabsContent>
          <TabsContent value="2" className="mt-4">
            {inn1 ? (
              <InningsEditor
                key={`i2-${innings.find((i) => i.inningsNumber === 2)?.id ?? "new"}-${match.status}`}
                matchId={match.id}
                inningsNumber={2}
                workspace={data}
                readOnly={!canEnterScores}
                onSaved={() => { refetch(); invalidate(); }}
              />
            ) : (
              <p className="text-muted-foreground">Save innings 1 first.</p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Complete match */}
      {canEnterScores && inn1 && (
        <CompleteMatchCard
          players={players}
          pending={completeMatch.isPending}
          onComplete={(playerOfMatchId) => {
            if (confirm("Complete this match? Result and standings will be finalized."))
              completeMatch.mutate({ playerOfMatchId });
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Start match card
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
    <Card>
      <CardHeader>
        <CardTitle>Start Match</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Toss won by</Label>
          <Select value={tossWinner} onValueChange={setTossWinner}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={teamA.id}>{teamA.name}</SelectItem>
              <SelectItem value={teamB.id}>{teamB.name}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Elected to</Label>
          <Select value={decision} onValueChange={(v) => setDecision(v as "BAT" | "BOWL")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BAT">Bat</SelectItem>
              <SelectItem value="BOWL">Bowl</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button disabled={pending || !tossWinner} onClick={() => onStart(tossWinner, decision)}>
          Start Match (Go Live)
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Complete match card
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
    <Card>
      <CardHeader>
        <CardTitle>Complete Match</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Player of the Match (optional)</Label>
          <Select value={pom} onValueChange={setPom}>
            <SelectTrigger className="w-56">
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
          variant="default"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={pending}
          onClick={() => onComplete(pom || undefined)}
        >
          Complete Match & Finalize Result
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Innings scorecard editor
// ---------------------------------------------------------------------------

type BatRow = {
  playerId: string;
  name: string;
  batted: boolean;
  runs: string;
  balls: string;
  fours: string;
  sixes: string;
  isOut: boolean;
  dismissal: string;
};

type BowlRow = {
  playerId: string;
  name: string;
  bowled: boolean;
  overs: string;
  maidens: string;
  runs: string;
  wickets: string;
  wides: string;
  noBalls: string;
};

function InningsEditor({
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
  const { innings, players, teams } = workspace;
  const existing = innings.find((i) => i.inningsNumber === inningsNumber);
  const inn1 = innings.find((i) => i.inningsNumber === 1);

  // Determine batting/bowling teams
  let battingTeamId: string | null = existing?.battingTeamId ?? null;
  let bowlingTeamId: string | null = existing?.bowlingTeamId ?? null;
  if (!battingTeamId && inningsNumber === 2 && inn1) {
    battingTeamId = inn1.bowlingTeamId;
    bowlingTeamId = inn1.battingTeamId;
  }
  if (!battingTeamId && inningsNumber === 1) {
    battingTeamId = workspace.match.teamAId ?? null;
    bowlingTeamId = workspace.match.teamBId ?? null;
  }

  const battingPlayers = players.filter((p) => p.teamId === battingTeamId);
  const bowlingPlayers = players.filter((p) => p.teamId === bowlingTeamId);
  const battingTeam = teams.find((t) => t.id === battingTeamId);
  const bowlingTeam = teams.find((t) => t.id === bowlingTeamId);

  const [batRows, setBatRows] = useState<BatRow[]>(() =>
    battingPlayers.map((p) => {
      const ex = existing?.batting.find((b) => b.playerId === p.id);
      return {
        playerId: p.id,
        name: p.name,
        batted: !!ex,
        runs: ex?.runs.toString() ?? "",
        balls: ex?.balls.toString() ?? "",
        fours: ex?.fours.toString() ?? "",
        sixes: ex?.sixes.toString() ?? "",
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
        overs: ex ? ballsToOversText(ex.balls) : "",
        maidens: ex?.maidens.toString() ?? "",
        runs: ex?.runs.toString() ?? "",
        wickets: ex?.wickets.toString() ?? "",
        wides: ex?.wides.toString() ?? "",
        noBalls: ex?.noBalls.toString() ?? "",
      };
    }),
  );
  const [extras, setExtras] = useState({
    wides: existing?.wides.toString() ?? "0",
    noBalls: existing?.noBalls.toString() ?? "0",
    byes: existing?.byes.toString() ?? "0",
    legByes: existing?.legByes.toString() ?? "0",
    penaltyRuns: existing?.penaltyRuns.toString() ?? "0",
  });
  const [closed, setClosed] = useState(existing?.completed ?? false);

  const save = useMutation({
    mutationFn: (args: Parameters<typeof fbSaveInnings>[0]) => fbSaveInnings(args),
    onSuccess: (r) => {
      toast.success(`Innings saved: ${r.runs}/${r.wickets} (${ballsToOversText(r.balls)} ov)`);
      onSaved();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    const batting = batRows
      .filter((r) => r.batted)
      .map((r, i) => ({
        playerId: r.playerId,
        battingOrder: i + 1,
        runs: Number(r.runs) || 0,
        balls: Number(r.balls) || 0,
        fours: Number(r.fours) || 0,
        sixes: Number(r.sixes) || 0,
        isOut: r.isOut,
        dismissal: r.dismissal || undefined,
      }));

    const bowling: {
      playerId: string; balls: number; maidens: number;
      runs: number; wickets: number; wides: number; noBalls: number;
    }[] = [];
    for (const r of bowlRows.filter((x) => x.bowled)) {
      const oversNum = parseFloat(r.overs || "0");
      const balls = oversToBalls(oversNum);
      if (Number.isNaN(balls)) {
        toast.error(`Invalid overs "${r.overs}" for ${r.name} — use format like 2.3`);
        return;
      }
      bowling.push({
        playerId: r.playerId,
        balls,
        maidens: Number(r.maidens) || 0,
        runs: Number(r.runs) || 0,
        wickets: Number(r.wickets) || 0,
        wides: Number(r.wides) || 0,
        noBalls: Number(r.noBalls) || 0,
      });
    }

    save.mutate({
      matchId,
      inningsNumber,
      wides: Number(extras.wides) || 0,
      noBalls: Number(extras.noBalls) || 0,
      byes: Number(extras.byes) || 0,
      legByes: Number(extras.legByes) || 0,
      penaltyRuns: Number(extras.penaltyRuns) || 0,
      batting,
      bowling,
      completed: closed,
    });
  };

  const num = (v: string) => Number(v) || 0;
  const batRuns = batRows.filter((r) => r.batted).reduce((s, r) => s + num(r.runs), 0);
  const extrasTotal =
    num(extras.wides) + num(extras.noBalls) + num(extras.byes) + num(extras.legByes) + num(extras.penaltyRuns);
  const totalBalls = bowlRows
    .filter((r) => r.bowled)
    .reduce((s, r) => s + (oversToBalls(parseFloat(r.overs || "0")) || 0), 0);
  const totalWkts = batRows.filter((r) => r.batted && r.isOut).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Innings {inningsNumber}: {battingTeam?.name ?? "?"} batting
            {bowlingTeam ? ` · ${bowlingTeam.name} bowling` : ""}
          </span>
          {existing && (
            <Badge variant="secondary" className="font-mono">
              Current: {existing.runs}/{existing.wickets} ({ballsToOversText(existing.balls)} ov)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {battingPlayers.length === 0 || bowlingPlayers.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Add players to both teams first (Players page) to enter a scorecard.
          </p>
        ) : (
          <>
            {/* Batting */}
            <div>
              <h3 className="font-semibold mb-2">Batting — {battingTeam?.name}</h3>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="p-2 w-10"></th>
                      <th className="p-2">Batter</th>
                      <th className="p-2 w-16">R</th>
                      <th className="p-2 w-16">B</th>
                      <th className="p-2 w-14">4s</th>
                      <th className="p-2 w-14">6s</th>
                      <th className="p-2 w-14">Out</th>
                      <th className="p-2 w-44">Dismissal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batRows.map((r, i) => (
                      <tr key={r.playerId} className="border-b last:border-0">
                        <td className="p-2">
                          <Checkbox
                            disabled={readOnly}
                            checked={r.batted}
                            onCheckedChange={(c) =>
                              setBatRows((rows) =>
                                rows.map((x, j) => (j === i ? { ...x, batted: !!c } : x)),
                              )
                            }
                          />
                        </td>
                        <td className="p-2 font-medium whitespace-nowrap">{r.name}</td>
                        {(["runs", "balls", "fours", "sixes"] as const).map((f) => (
                          <td key={f} className="p-1">
                            <Input
                              type="number"
                              min={0}
                              disabled={readOnly || !r.batted}
                              value={r[f]}
                              onChange={(e) =>
                                setBatRows((rows) =>
                                  rows.map((x, j) => (j === i ? { ...x, [f]: e.target.value } : x)),
                                )
                              }
                              className="h-8 w-full"
                            />
                          </td>
                        ))}
                        <td className="p-2 text-center">
                          <Checkbox
                            disabled={readOnly || !r.batted}
                            checked={r.isOut}
                            onCheckedChange={(c) =>
                              setBatRows((rows) =>
                                rows.map((x, j) => (j === i ? { ...x, isOut: !!c } : x)),
                              )
                            }
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            disabled={readOnly || !r.batted || !r.isOut}
                            value={r.dismissal}
                            onChange={(e) =>
                              setBatRows((rows) =>
                                rows.map((x, j) => (j === i ? { ...x, dismissal: e.target.value } : x)),
                              )
                            }
                            placeholder="e.g. b Ahmed"
                            className="h-8"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bowling */}
            <div>
              <h3 className="font-semibold mb-2">Bowling — {bowlingTeam?.name}</h3>
              <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="p-2 w-10"></th>
                      <th className="p-2">Bowler</th>
                      <th className="p-2 w-20">Overs</th>
                      <th className="p-2 w-14">M</th>
                      <th className="p-2 w-16">R</th>
                      <th className="p-2 w-14">W</th>
                      <th className="p-2 w-14">Wd</th>
                      <th className="p-2 w-14">Nb</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bowlRows.map((r, i) => (
                      <tr key={r.playerId} className="border-b last:border-0">
                        <td className="p-2">
                          <Checkbox
                            disabled={readOnly}
                            checked={r.bowled}
                            onCheckedChange={(c) =>
                              setBowlRows((rows) =>
                                rows.map((x, j) => (j === i ? { ...x, bowled: !!c } : x)),
                              )
                            }
                          />
                        </td>
                        <td className="p-2 font-medium whitespace-nowrap">{r.name}</td>
                        {(["overs", "maidens", "runs", "wickets", "wides", "noBalls"] as const).map(
                          (f) => (
                            <td key={f} className="p-1">
                              <Input
                                type={f === "overs" ? "text" : "number"}
                                min={0}
                                disabled={readOnly || !r.bowled}
                                value={r[f]}
                                onChange={(e) =>
                                  setBowlRows((rows) =>
                                    rows.map((x, j) => (j === i ? { ...x, [f]: e.target.value } : x)),
                                  )
                                }
                                placeholder={f === "overs" ? "e.g. 2.3" : ""}
                                className="h-8 w-full"
                              />
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Overs in cricket notation: 2.3 = 2 overs 3 balls.
              </p>
            </div>

            {/* Extras */}
            <div>
              <h3 className="font-semibold mb-2">Extras</h3>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    ["wides", "Wides"],
                    ["noBalls", "No-balls"],
                    ["byes", "Byes"],
                    ["legByes", "Leg byes"],
                    ["penaltyRuns", "Penalty"],
                  ] as const
                ).map(([f, label]) => (
                  <div key={f} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      disabled={readOnly}
                      value={extras[f]}
                      onChange={(e) => setExtras({ ...extras, [f]: e.target.value })}
                      className="w-20 h-8"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Preview + save */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/50 p-4">
              <p className="font-mono font-bold">
                Projected: {batRuns + extrasTotal}/{totalWkts} ({ballsToOversText(totalBalls)} ov)
                <span className="block text-xs font-normal text-muted-foreground">
                  bat {batRuns} + extras {extrasTotal}
                </span>
              </p>
              {!readOnly && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={closed} onCheckedChange={(c) => setClosed(!!c)} />
                    Innings closed
                  </label>
                  <Button disabled={save.isPending} onClick={handleSave}>
                    Save Innings
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
