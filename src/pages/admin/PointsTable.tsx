import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/providers/trpc";
import { getStandings } from "@/lib/queries";
import { recalculateStandings } from "@/lib/tournament-logic";
import { setTiebreak } from "@/lib/mutations";
import { StandingsTable } from "@/components/StandingsTable";
import { NRRExplanation } from "@/components/NRRExplanation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

export default function AdminPointsTable() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["standings"],
    queryFn: getStandings,
  });
  const [tiebreaks, setTiebreaks] = useState<Record<string, string>>({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["standings"] });

  const recalc = useMutation({
    mutationFn: () => recalculateStandings(),
    onSuccess: () => { toast.success("Standings recalculated"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const applyTiebreak = useMutation({
    mutationFn: (args: { teamId: string; value: number }) => setTiebreak(args),
    onSuccess: () => { toast.success("Tiebreak applied"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !rows) return <Skeleton className="m-6 h-72" />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Points Table (Admin)</h1>
        <Button variant="outline" disabled={recalc.isPending} onClick={() => recalc.mutate()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Recalculate
        </Button>
      </div>

      <StandingsTable rows={rows} />

      <div>
        <h2 className="text-lg font-semibold mb-2">Tie-break control</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Used only when two teams are level on points AND net run rate. A higher
          value ranks the team higher (e.g. head-to-head winner gets 1).
        </p>
        <div className="rounded-lg border max-w-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead className="w-28">Tiebreak</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.teamId}>
                  <TableCell className="font-medium">{s.team?.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="h-8 w-20"
                      placeholder={String(s.adminTiebreak)}
                      value={tiebreaks[s.teamId] ?? ""}
                      onChange={(e) =>
                        setTiebreaks({ ...tiebreaks, [s.teamId]: e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={applyTiebreak.isPending || tiebreaks[s.teamId] === undefined}
                      onClick={() =>
                        applyTiebreak.mutate({
                          teamId: s.teamId,
                          value: Number(tiebreaks[s.teamId]) || 0,
                        })
                      }
                    >
                      Apply
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <NRRExplanation />
    </div>
  );
}
