import { useQuery } from "@tanstack/react-query";
import { getTeams, getPlayers } from "@/lib/queries";
import { TeamBadge } from "@/components/TeamBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight } from "lucide-react";
import { Link } from "react-router";

export default function Teams() {
  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });
  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ["players"],
    queryFn: getPlayers,
  });

  if (loadingTeams || loadingPlayers || !teams) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
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
          Explore all 6 WASA Premier League teams and their full 7-member squads.
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

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teams
              .filter((t) => t.groupName === group)
              .map((t) => {
                const teamPlayers = (players ?? []).filter((p) => p.teamId === t.id);

                return (
                  <Card key={t.id} className="h-full flex flex-col justify-between border shadow-sm hover:shadow-md hover:border-primary/50 transition-all overflow-hidden bg-card">
                    <div>
                      {/* Card Header */}
                      <div className="p-4 sm:p-5 border-b bg-muted/20 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <TeamBadge shortName={t.shortName} logoUrl={t.logoUrl} size="md" />
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-base truncate">
                              {t.name}
                            </h3>
                            <p className="text-[11px] text-muted-foreground font-mono">
                              Code: {t.shortName}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
                          {teamPlayers.length} Members
                        </Badge>
                      </div>

                      {/* Complete Squad List */}
                      <CardContent className="p-4 space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 pb-1">
                          <Users className="h-3.5 w-3.5 text-emerald-500" /> Complete 7-Member Squad
                        </div>

                        {teamPlayers.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-3">
                            Squad not announced yet.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {teamPlayers.map((p, idx) => {
                              const isCap = p.isCaptain || p.designation === "Captain";
                              const isVc = p.isViceCaptain || p.designation === "Vice Captain";

                              return (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-muted/30 border border-border/50 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono text-muted-foreground w-3 text-center text-[10px]">
                                      {idx + 1}
                                    </span>
                                    <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
                                    <span className="font-semibold truncate text-foreground">
                                      {p.name}
                                    </span>
                                    {isCap && (
                                      <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold shrink-0">
                                        (C)
                                      </Badge>
                                    )}
                                    {isVc && (
                                      <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold shrink-0">
                                        (VC)
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-[9px] shrink-0 font-medium ml-1">
                                    {p.role}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </div>

                    {/* Card Footer Link */}
                    <div className="p-3 bg-muted/10 border-t">
                      <Link
                        to={`/teams/${t.id}`}
                        className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary hover:underline py-1"
                      >
                        View Full Team Profile & Stats <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </Card>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
