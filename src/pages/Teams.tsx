import { useQuery } from "@tanstack/react-query";
import { getTeams } from "@/lib/queries";
import { TeamBadge } from "@/components/TeamBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";

export default function Teams() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });

  if (isLoading || !teams) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Teams</h1>
      {(["A", "B"] as const).map((group) => (
        <section key={group} className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-emerald-500">
            Group {group}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams
              .filter((t) => t.groupName === group)
              .map((t) => (
                <Link key={t.id} to={`/teams/${t.id}`}>
                  <Card className="hover:shadow-md hover:border-primary/40 transition-all">
                    <CardContent className="p-5 flex items-center gap-4">
                      <TeamBadge shortName={t.shortName} logoUrl={t.logoUrl} size="lg" />
                      <div>
                        <p className="font-bold text-lg">{t.name}</p>
                        <Badge variant="outline" className="mt-1">
                          Group {t.groupName}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
