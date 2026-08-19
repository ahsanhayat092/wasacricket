import { useQuery } from "@tanstack/react-query";
import { getMatchById } from "@/lib/queries";
import { useParams, Link } from "react-router";
import { TeamBadge } from "@/components/TeamBadge";
import { ScorecardView, type InningsData } from "@/components/ScorecardView";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { statusBadgeClass, type MatchStatus } from "@/lib/cricket";
import { Award, CalendarDays, MapPin } from "lucide-react";

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["match", id],
    queryFn: () => getMatchById(id!),
    enabled: !!id,
    refetchInterval: 20000,
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const { match, innings, playerOfMatch } = data;
  const teamName = (teamId: string) =>
    match.teamA?.id === teamId
      ? match.teamA.name
      : match.teamB?.id === teamId
        ? match.teamB.name
        : "Team";

  const inningsView: InningsData[] = innings.map((inn) => ({
    ...inn,
    battingTeamName: `${teamName(inn.battingTeamId)} Innings`,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
              {match.stage === "FINAL" ? "🏆 Final" : `Match ${match.matchNumber}`} ·{" "}
              {match.day}
            </span>
            <Badge
              variant="outline"
              className={statusBadgeClass(match.status as MatchStatus)}
            >
              {match.status.replace("_", " ")}
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamBadge
                shortName={match.teamA?.shortName ?? "TBD"}
                logoUrl={match.teamA?.logoUrl}
                size="lg"
              />
              <span className="font-bold text-center">
                {match.teamA?.name ?? "Rank 1"}
              </span>
              {innings.find((i) => i.battingTeamId === match.teamA?.id) && (
                <span className="font-mono text-lg">
                  {innings.find((i) => i.battingTeamId === match.teamA?.id)!.runs}/
                  {innings.find((i) => i.battingTeamId === match.teamA?.id)!.wickets}
                </span>
              )}
            </div>
            <div className="text-muted-foreground font-bold text-sm">VS</div>
            <div className="flex flex-col items-center gap-2 flex-1">
              <TeamBadge
                shortName={match.teamB?.shortName ?? "TBD"}
                logoUrl={match.teamB?.logoUrl}
                size="lg"
              />
              <span className="font-bold text-center">
                {match.teamB?.name ?? "Rank 2"}
              </span>
              {innings.find((i) => i.battingTeamId === match.teamB?.id) && (
                <span className="font-mono text-lg">
                  {innings.find((i) => i.battingTeamId === match.teamB?.id)!.runs}/
                  {innings.find((i) => i.battingTeamId === match.teamB?.id)!.wickets}
                </span>
              )}
            </div>
          </div>

          {match.resultText && (
            <p className="mt-5 text-center text-lg font-bold text-emerald-500">
              {match.resultText}
            </p>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {match.tossWinner && (
              <span>
                Toss: {match.tossWinner.name} elected to{" "}
                {match.tossDecision === "BAT" ? "bat" : "bowl"}
              </span>
            )}
            {match.date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {match.date}
                {match.time ? ` · ${match.time}` : ""}
              </span>
            )}
            {match.venue && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {match.venue}
              </span>
            )}
          </div>

          {playerOfMatch && (
            <div className="mt-4 flex justify-center">
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 gap-1.5 py-1.5 px-3">
                <Award className="h-4 w-4" /> Player of the Match:{" "}
                {playerOfMatch.name}
              </Badge>
            </div>
          )}

          {match.status === "LIVE" && (
            <div className="mt-4 text-center">
              <Link to={`/live/${match.id}`} className="text-sm text-red-500 font-medium hover:underline">
                ● Open Live Match Centre →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {inningsView.length === 0 ? (
        <p className="text-center text-muted-foreground">
          {match.status === "UPCOMING"
            ? "This match has not started yet."
            : "No scorecard recorded."}
        </p>
      ) : (
        inningsView.map((inn) => <ScorecardView key={inn.id} innings={inn} />)
      )}
    </div>
  );
}
