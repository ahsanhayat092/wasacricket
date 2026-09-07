import { useQuery } from "@tanstack/react-query";
import { getStandings } from "@/lib/queries";
import { useTournament } from "@/context/TournamentContext";
import { StandingsTable } from "@/components/StandingsTable";
import { NRRExplanation } from "@/components/NRRExplanation";
import { Skeleton } from "@/components/ui/skeleton";

export default function PointsTable() {
  const { tournamentId, tournament } = useTournament();
  const format = tournament?.playoffFormat || "DIRECT_TOP2";
  const { data: rows, isLoading } = useQuery({
    queryKey: ["standings", tournamentId],
    queryFn: () => getStandings(tournamentId),
    refetchInterval: 20000,
  });

  const isGrouped =
    tournament?.stageFormat === "GROUPS_AND_KNOCKOUT" ||
    (rows && new Set(rows.map((r) => r.groupName || r.team?.groupName).filter(Boolean)).size >= 2);
  const teamsAdvance = tournament?.teamsPerGroupAdvance ?? (tournament?.groupPlayoffFormat === "GROUP_DIRECT_FINAL" ? 1 : 2);

  const subtitleText = isGrouped
    ? `Group Stage Format: Teams compete within their assigned groups. Top ${teamsAdvance} from each group advance to the ${teamsAdvance === 1 ? "Grand Final" : "Semi-Finals (A1 vs B2, B1 vs A2)"}.`
    : format === "DIRECT_TOP2"
      ? "Top 2 teams qualify directly for the Grand Final. Remaining teams are eliminated."
      : format === "PAGE_PLAYOFF_TOP3"
        ? "Rank 1 qualifies for the Grand Final. Rank 2 and Rank 3 play in the Playoff match."
        : format === "IPL_TOP4"
          ? "Rank 1 & 2 play Qualifier 1. Rank 3 & 4 play the Eliminator."
          : format === "SEMI_FINALS"
            ? "Top 4 teams advance to the Semi-Finals (Rank 1 vs 4, Rank 2 vs 3)."
            : "Single table format. The table topper is crowned Tournament Champion.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2">Points Table</h1>
        <p className="text-sm text-muted-foreground">{subtitleText}</p>
      </div>

      {isLoading || !rows ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <>
          <StandingsTable
            rows={rows}
            playoffFormat={format}
            stageFormat={tournament?.stageFormat}
            teamsPerGroupAdvance={tournament?.teamsPerGroupAdvance}
          />
          
          <NRRExplanation />
        </>
      )}
    </div>
  );
}
