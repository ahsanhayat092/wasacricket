import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getSchedule } from "@/lib/queries";
import { updateMatchDetails, setMatchStatus } from "@/lib/mutations";
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
import { statusBadgeClass, type MatchStatus } from "@/lib/cricket";
import { toast } from "sonner";

export default function AdminMatches() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["schedule"],
    queryFn: getSchedule,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["schedule"] });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
  };

  const setStatus = useMutation({
    mutationFn: (args: { matchId: string; status: "NO_RESULT" | "ABANDONED" }) =>
      setMatchStatus(args),
    onSuccess: () => { toast.success("Status updated"); invalidate(); },
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
              <TableHead className="w-64" />
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
                <TableCell className="font-medium whitespace-nowrap">
                  {m.stage === "FINAL" ? "🏆 Final" : `M${m.matchNumber}`}
                </TableCell>
                <TableCell>{m.day}</TableCell>
                <TableCell>
                  {m.teamA?.name ?? "Rank 1"} vs {m.teamB?.name ?? "Rank 2"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusBadgeClass(m.status as MatchStatus)}
                  >
                    {m.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-56 truncate">
                  {m.resultText ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
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
