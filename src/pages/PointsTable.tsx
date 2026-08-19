import { useQuery } from "@tanstack/react-query";
import { getStandings } from "@/lib/queries";
import { StandingsTable } from "@/components/StandingsTable";
import { Skeleton } from "@/components/ui/skeleton";

export default function PointsTable() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["standings"],
    queryFn: getStandings,
    refetchInterval: 20000,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Points Table</h1>
      <p className="text-sm text-muted-foreground mb-6">
        All six teams ranked together. Top two qualify for the Final. Ranked by
        points, then net run rate.
      </p>
      {isLoading || !rows ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <>
          <StandingsTable rows={rows} />
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <p>🥇🥈 Top two teams qualify for the Final on Sunday.</p>
            <p>
              P = Played · W = Won · L = Lost · T = Tied · NR = No Result · PTS =
              Points · NRR = Net Run Rate
            </p>
          </div>
        </>
      )}
    </div>
  );
}
