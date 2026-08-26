import { useQuery } from "@tanstack/react-query";
import { getResults } from "@/lib/queries";
import { useTournament } from "@/context/TournamentContext";
import { MatchCard, type HydratedMatch } from "@/components/MatchCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function Results() {
  const { tournamentId } = useTournament();
  const { data: matches, isLoading } = useQuery({
    queryKey: ["results", tournamentId],
    queryFn: () => getResults(tournamentId),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Results</h1>
      {isLoading || !matches ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <p className="text-muted-foreground">
          No matches have been completed yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...matches].reverse().map((m) => (
            <MatchCard key={m.id} match={m as HydratedMatch} />
          ))}
        </div>
      )}
    </div>
  );
}
