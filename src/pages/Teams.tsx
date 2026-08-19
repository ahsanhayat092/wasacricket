import { useQuery } from "@tanstack/react-query";
import { getTeams, getPlayers } from "@/lib/queries";
import { TeamBadge } from "@/components/TeamBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Crown, Users } from "lucide-react";
import { Link } from "react-router";

export default function Teams() {
  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });
  const { data: players } = useQuery({
    queryKey: ["players"],
    queryFn: getPlayers,
  });

  if (loadingTeams || !teams) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
          Tournament Teams & Squads
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore all 6 WASA Premier League teams, assigned groups, captains, and squad rosters.
        </p>
      </div>

      {(["A", "B"] as const).map((group) => (
        <section key={group} className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-emerald-500/40 text-emerald-500 font-bold">
              GROUP {group}
            </Badge>
            <h2 className="text-lg font-bold tracking-tight">
              Group {group} Contenders
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams
              .filter((t) => t.groupName === group)
              .map((t) => {
                const teamPlayers = (players ?? []).filter((p) => p.teamId === t.id);
                const captain = teamPlayers.find(
                  (p) => p.isCaptain || p.designation === "Captain",
                );

                return (
                  <Link key={t.id} to={`/teams/${t.id}`} className="group">
                    <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all">
                      <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                        <div className="flex items-center gap-4">
                          <TeamBadge shortName={t.shortName} logoUrl={t.logoUrl} size="lg" />
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-lg truncate group-hover:text-primary transition-colors">
                              {t.name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono font-medium">
                              Code: {t.shortName}
                            </p>
                          </div>
                        </div>

                        <div className="border-t pt-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            {captain ? (
                              <span className="font-semibold text-amber-500 flex items-center gap-1 truncate">
                                <Crown className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">C: {captain.name}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">
                                Captain TBA
                              </span>
                            )}
                          </div>
                          <span className="text-muted-foreground flex items-center gap-1 shrink-0 font-medium">
                            <Users className="h-3 w-3" />
                            {teamPlayers.length} players
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
