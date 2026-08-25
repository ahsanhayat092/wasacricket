import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getSchedule } from "@/lib/queries";
import { updateMatchDetails, setMatchStatus, resetMatch as fbResetMatch } from "@/lib/mutations";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { RotateCcw, Trophy } from "lucide-react";

export default function AdminMatches() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["schedule"],
    queryFn: getSchedule,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["schedule"] });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
    queryClient.invalidateQueries({ queryKey: ["statistics"] });
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
                <TableCell className="font-bold">
                  {m.stage === "FINAL" ? "🏆 Grand Final" : m.stage === "PLAYOFF" ? "⚔️ Playoff" : `Match ${m.matchNumber}`}
                </TableCell>
                <TableCell className="text-xs">
                  <div className="font-semibold text-foreground">{formatMatchDay(m.day, m.date)}</div>
                  {m.time && (
                    <div className="text-[11px] text-amber-500 font-mono font-bold">{m.time}</div>
                  )}
                </TableCell>
                <TableCell className="font-semibold">
                  {m.teamA?.shortName ?? "TBD"} vs {m.teamB?.shortName ?? "TBD"}
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
