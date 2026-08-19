import { useQuery } from "@tanstack/react-query";
import { getTeamDetail } from "@/lib/queries";
import { TeamBadge } from "@/components/TeamBadge";
import { MatchCard, type HydratedMatch } from "@/components/MatchCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useParams } from "react-router";
import { fmtNrr } from "@/lib/cricket";

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: () => getTeamDetail(id!),
    enabled: !!id,
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { team, players, matches, standing } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Header */}
      <Card>
        <CardContent className="p-6 flex flex-wrap items-center gap-5">
          <TeamBadge shortName={team.shortName} logoUrl={team.logoUrl} size="xl" />
          <div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Group {team.groupName}</Badge>
              {standing?.qualified && (
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  QUALIFIED FOR FINAL
                </Badge>
              )}
            </div>
          </div>
          {standing && (
            <div className="ml-auto grid grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-2xl font-extrabold">{standing.position}</p>
                <p className="text-xs text-muted-foreground">Rank</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold">{standing.points}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold">
                  {standing.won}/{standing.played}
                </p>
                <p className="text-xs text-muted-foreground">Won/Played</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold">{fmtNrr(standing.nrr)}</p>
                <p className="text-xs text-muted-foreground">NRR</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Squad */}
      <Card>
        <CardHeader>
          <CardTitle>Squad ({players.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Squad not announced yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Batting</TableHead>
                  <TableHead>Bowling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((p) => {
                  const isCap = p.isCaptain || p.designation === "Captain";
                  const isVc = p.isViceCaptain || p.designation === "Vice Captain";

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground font-mono">
                        {p.jerseyNumber ?? "—"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <span>{p.name}</span>
                          {isCap && (
                            <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-[10px] py-0 px-1.5 font-bold">
                              (C) Captain
                            </Badge>
                          )}
                          {isVc && (
                            <Badge className="bg-sky-600 hover:bg-sky-600 text-white text-[10px] py-0 px-1.5 font-bold">
                              (VC)
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.battingStyle ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.bowlingStyle ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Matches */}
      <section>
        <h2 className="text-xl font-bold mb-3">Matches</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No fixtures.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <MatchCard key={m.id} match={m as HydratedMatch} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
