import { useQuery } from "@tanstack/react-query";
import { getStandings, getSchedule } from "@/lib/queries";
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
  const { data: schedule } = useQuery({
    queryKey: ["schedule", tournamentId],
    queryFn: () => getSchedule(tournamentId),
    refetchInterval: 20000,
  });

  const leagueMatches = (schedule || []).filter(
    (m) => m.stage === "LEAGUE" || (!m.stage && (m.matchNumber ?? 0) <= 9)
  );
  const allLeagueMatchesCompleted =
    leagueMatches.length > 0 &&
    leagueMatches.every(
      (m) => m.status === "COMPLETED" || m.status === "NO_RESULT" || m.status === "ABANDONED"
    );

  const isGrouped = tournament?.stageFormat === "GROUPS_AND_KNOCKOUT";
  const teamsAdvance = tournament?.teamsPerGroupAdvance ?? (tournament?.groupPlayoffFormat === "GROUP_DIRECT_FINAL" ? 1 : 2);

  const subtitleText = !allLeagueMatchesCompleted
    ? (isGrouped
        ? "Group Stage in Progress: Teams compete within their assigned groups. Knockout spots will be decided upon completion of all group matches."
        : "League Stage in Progress: Official Playoff and Grand Final spots will be decided upon completion of all league matches.")
    : (isGrouped
        ? `Group Stage Format: Top ${teamsAdvance} from each group advance to the ${teamsAdvance === 1 ? "Grand Final" : "Semi-Finals (A1 vs B2, B1 vs A2)"}.`
        : format === "DIRECT_TOP2"
          ? "Top 2 teams qualify directly for the Grand Final. Remaining teams are eliminated."
          : format === "PAGE_PLAYOFF_TOP3"
            ? "Rank 1 qualifies for the Grand Final. Rank 2 and Rank 3 play in the Playoff match."
            : format === "IPL_TOP4"
              ? "Rank 1 & 2 play Qualifier 1. Rank 3 & 4 play the Eliminator."
              : format === "SEMI_FINALS"
                ? "Top 4 teams advance to the Semi-Finals (Rank 1 vs 4, Rank 2 vs 3)."
                : "Single table format. The table topper is crowned Tournament Champion.");

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
            allLeagueMatchesCompleted={allLeagueMatchesCompleted}
          />
          
          <NRRExplanation />
        </>
      )}
    </div>
  );
}
