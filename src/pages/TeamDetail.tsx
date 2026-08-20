import { useQuery } from "@tanstack/react-query";
import { getTeamDetail } from "@/lib/queries";
import { TeamBadge } from "@/components/TeamBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
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
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const { team, players, matches, standing } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Team header */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <TeamBadge shortName={team.shortName} logoUrl={team.logoUrl} size="lg" />
          <div className="text-center sm:text-left space-y-1">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-2xl sm:text-3xl font-extrabold">{team.name}</h1>
              <Badge variant="outline">Group {team.groupName}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Official Tournament Squad · WASA Premier League
            </p>
          </div>

          {standing && (
            <div className="sm:ml-auto grid grid-cols-4 gap-3 text-center border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6">
              <div>
                <span className="text-xs text-muted-foreground">P</span>
                <p className="text-lg font-bold">{standing.played}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">W</span>
                <p className="text-lg font-bold text-emerald-500">{standing.won}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Pts</span>
                <p className="text-lg font-black text-primary">{standing.points}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">NRR</span>
                <p className="text-sm font-mono font-bold mt-0.5">{fmtNrr(standing.nrr)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Squad roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Squad Roster ({players.length} Players)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {players.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No players assigned to this team.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
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
                        <div className="flex items-center gap-2.5">
                          <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="sm" />
                          <div className="flex items-center gap-1.5">
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
