import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getSchedule } from "@/lib/queries";
import { updateMatchDetails, setMatchStatus, resetMatch as fbResetMatch, deleteMatch as fbDeleteMatch } from "@/lib/mutations";
import { Link } from "react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusBadgeClass, formatMatchDay, type MatchStatus } from "@/lib/cricket";
import { toast } from "sonner";
import { RotateCcw, Trophy, Trash2, Sliders, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HydratedMatch } from "@/lib/firestore";

import { useTournament } from "@/context/TournamentContext";

export default function AdminMatches() {
  const { tournamentId } = useTournament();

  const [openOversDialog, setOpenOversDialog] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<HydratedMatch | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<HydratedMatch | null>(null);
  const [editOvers, setEditOvers] = useState<number>(4);
  const [editMaxBowler, setEditMaxBowler] = useState<number>(1);

  const { data: matches, isLoading } = useQuery({
    queryKey: ["schedule", tournamentId],
    queryFn: () => getSchedule(tournamentId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["schedule", tournamentId] });
    queryClient.invalidateQueries({ queryKey: ["schedule"] });
    queryClient.invalidateQueries({ queryKey: ["matches", tournamentId] });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["standings", tournamentId] });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
    queryClient.invalidateQueries({ queryKey: ["statistics"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
  };

  const setStatus = useMutation({
    mutationFn: (args: { matchId: string; status: "NO_RESULT" | "ABANDONED" }) =>
      setMatchStatus(args),
    onSuccess: () => { toast.success("Status updated"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetMatchMutation = useMutation({
    mutationFn: (matchId: string) => fbResetMatch(matchId),
    onSuccess: () => {
      toast.success("Match reset successfully! All scorecards and toss data cleared.");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMatchMutation = useMutation({
    mutationFn: (matchId: string) => fbDeleteMatch(matchId),
    onSuccess: () => {
      toast.success("Match and its scorecards deleted successfully!");
      setMatchToDelete(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete match"),
  });

  const saveOversMutation = useMutation({
    mutationFn: () => {
      if (!selectedMatch) throw new Error("No match selected");
      return updateMatchDetails({
        matchId: selectedMatch.id,
        oversPerSide: editOvers,
        maxOverPerBowler: editMaxBowler,
      });
    },
    onSuccess: () => {
      toast.success(`Match updated: ${editOvers} overs per side, ${editMaxBowler} max per bowler`);
      setOpenOversDialog(false);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Matches & Scorecards</h1>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Match</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="w-72" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6}>Loading…</TableCell>
              </TableRow>
            )}
            {matches?.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-bold">
                    {m.stage === "FINAL" ? "🏆 Grand Final" : m.stage === "PLAYOFF" ? "⚔️ Playoff" : `Match ${m.matchNumber}`}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">
                    {m.oversPerSide ?? 4} Ov · {m.maxOverPerBowler ?? (m.oversPerSide && m.oversPerSide <= 5 ? 1 : Math.ceil((m.oversPerSide || 4) / 5))} max
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="font-semibold text-foreground">{formatMatchDay(m.day, m.date)}</div>
                  {m.time && (
                    <div className="text-[11px] text-amber-500 font-mono font-bold">{m.time}</div>
                  )}
                </TableCell>
                <TableCell className="font-semibold text-xs">
                  {m.teamA?.shortName ?? (m.stage === "FINAL" ? "TBD (Rank 1)" : m.stage === "PLAYOFF" ? "TBD (Rank 2)" : "TBD")} vs{" "}
                  {m.teamB?.shortName ?? (m.stage === "FINAL" ? "TBD (Playoff Winner)" : m.stage === "PLAYOFF" ? "TBD (Rank 3)" : "TBD")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusBadgeClass(m.status as MatchStatus)}
                  >
                    {m.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-semibold max-w-64">
                  {m.resultText ? (
                    <span className="flex items-center gap-1.5 font-bold text-emerald-500">
                      <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      {m.resultText}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Link to={`/admin/matches/${m.id}`}>
                      <Button size="sm">Manage</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 border-border/80 font-medium"
                      onClick={() => {
                        setSelectedMatch(m);
                        const ov = m.oversPerSide ?? 4;
                        const maxB = m.maxOverPerBowler ?? (ov <= 5 ? 1 : Math.ceil(ov / 5));
                        setEditOvers(ov);
                        setEditMaxBowler(maxB);
                        setOpenOversDialog(true);
                      }}
                      title="Change match overs & bowler quota"
                    >
                      <Sliders className="h-3 w-3 text-emerald-500" /> Overs
                    </Button>
                    {(m.status === "UPCOMING" || m.status === "LIVE") && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setStatus.isPending}
                          onClick={() => {
                            if (confirm("Mark as No Result?"))
                              setStatus.mutate({ matchId: m.id, status: "NO_RESULT" });
                          }}
                        >
                          No Result
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setStatus.isPending}
                          onClick={() => {
                            if (confirm("Mark as Abandoned?"))
                              setStatus.mutate({ matchId: m.id, status: "ABANDONED" });
                          }}
                        >
                          Abandon
                        </Button>
                      </>
                    )}
                    {m.status !== "UPCOMING" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs gap-1"
                        disabled={resetMatchMutation.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              `⚠️ Reset & Restart Match ${m.matchNumber} (${m.teamA?.name ?? "Team A"} vs ${m.teamB?.name ?? "Team B"})?\n\nThis will permanently delete all innings, scorecards, and toss data for this match and start fresh.`
                            )
                          ) {
                            resetMatchMutation.mutate(m.id);
                          }
                        }}
                      >
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 text-xs gap-1"
                      disabled={deleteMatchMutation.isPending}
                      onClick={() => setMatchToDelete(m)}
                      title="Permanently Delete Match"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Match Overs Dialog */}
      <Dialog open={openOversDialog} onOpenChange={setOpenOversDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Sliders className="h-5 w-5 text-emerald-500" />
              Edit Match Overs & Bowler Quota
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Customize the total match overs and maximum bowler quota for Match #{selectedMatch?.matchNumber} ({selectedMatch?.teamA?.shortName ?? "Team A"} vs {selectedMatch?.teamB?.shortName ?? "Team B"}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                <Label className="text-xs font-bold text-foreground">Total Overs</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={editOvers}
                  onChange={(e) => {
                    const ov = Number(e.target.value) || 1;
                    setEditOvers(ov);
                    if (editMaxBowler > ov) setEditMaxBowler(ov);
                  }}
                  className="h-10 text-base font-bold text-center"
                />
                <span className="text-[11px] text-muted-foreground">Overs per side</span>
              </div>
              <div className="space-y-1.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                <Label className="text-xs font-bold text-foreground">Max Per Bowler</Label>
                <Input
                  type="number"
                  min={1}
                  max={editOvers}
                  value={editMaxBowler}
                  onChange={(e) => setEditMaxBowler(Number(e.target.value) || 1)}
                  className="h-10 text-base font-bold text-center"
                />
                <span className="text-[11px] text-muted-foreground">Quota per bowler</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Quick Presets</Label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { overs: 4, bowler: 1, label: "4 Ov (1 max)" },
                  { overs: 5, bowler: 1, label: "5 Ov (1 max)" },
                  { overs: 6, bowler: 2, label: "6 Ov (2 max)" },
                  { overs: 8, bowler: 2, label: "8 Ov (2 max)" },
                  { overs: 10, bowler: 2, label: "10 Ov (2 max)" },
                  { overs: 12, bowler: 3, label: "12 Ov (3 max)" },
                  { overs: 20, bowler: 4, label: "20 Ov (4 max)" },
                ].map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs font-medium",
                      editOvers === p.overs && editMaxBowler === p.bowler && "border-emerald-500 bg-emerald-500/15 text-emerald-500 font-bold"
                    )}
                    onClick={() => {
                      setEditOvers(p.overs);
                      setEditMaxBowler(p.bowler);
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpenOversDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={saveOversMutation.isPending}
              onClick={() => saveOversMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {saveOversMutation.isPending ? "Saving..." : "Save Match Rules"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Match Confirmation Dialog */}
      <Dialog open={!!matchToDelete} onOpenChange={(open) => !open && setMatchToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Delete Match #{matchToDelete?.matchNumber}?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this match fixture? All scorecards, toss data, and statistics will be removed.
            </DialogDescription>
          </DialogHeader>

          {matchToDelete && (
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Matchup:</span>
                <strong className="text-foreground">
                  {matchToDelete.teamA?.name ?? "TBD"} vs {matchToDelete.teamB?.name ?? "TBD"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage:</span>
                <span>{matchToDelete.stage} · {matchToDelete.oversPerSide ?? 4} Overs</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className={statusBadgeClass(matchToDelete.status as MatchStatus)}>
                  {matchToDelete.status}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setMatchToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMatchMutation.isPending}
              onClick={() => {
                if (matchToDelete) {
                  deleteMatchMutation.mutate(matchToDelete.id);
                }
              }}
              className="gap-2 font-bold"
            >
              {deleteMatchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
