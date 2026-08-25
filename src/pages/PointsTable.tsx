import { useQuery } from "@tanstack/react-query";
import { getStandings } from "@/lib/queries";
import { StandingsTable } from "@/components/StandingsTable";
import { NRRExplanation } from "@/components/NRRExplanation";
import { Skeleton } from "@/components/ui/skeleton";

export default function PointsTable() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["standings"],
    queryFn: getStandings,
    refetchInterval: 20000,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">Points Table</h1>
        <p className="text-sm text-muted-foreground">
          All six teams ranked in a single table. Rank 1 qualifies directly for the Grand Final. Ranks 2 & 3 play in the Playoff match.
        </p>
      </div>

      {isLoading || !rows ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <>
          <StandingsTable rows={rows} />
          
          <NRRExplanation />
        </>
      )}
    </div>
  );
}
