import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournament } from "@/lib/queries";
import { subscribeToMatch } from "@/lib/queries";
import { TeamBadge } from "@/components/TeamBadge";
import { ScorecardView, type InningsData } from "@/components/ScorecardView";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ballsToOversText } from "@/lib/cricket";
import type { Match, Innings, BattingScore, BowlingScore, Team } from "@/lib/firestore";
import { getSchedule } from "@/lib/queries";

type LiveData = {
  match: Match;
  innings: (Innings & {
    batting: (BattingScore & { playerName?: string })[];
    bowling: (BowlingScore & { playerName?: string })[];
  })[];
};

export default function LiveMatch() {
  const { id } = useParams<{ id: string }>();
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: tournament } = useQuery({
    queryKey: ["tournament"],
    queryFn: getTournament,
  });

  // Load teams for name lookup
  useEffect(() => {
    getSchedule().then((schedule) => {
      const teamMap = new Map<string, Team>();
      schedule.forEach((m) => {
        if (m.teamA) teamMap.set(m.teamA.id, m.teamA);
        if (m.teamB) teamMap.set(m.teamB.id, m.teamB);
      });
      setTeams([...teamMap.values()]);
    });
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToMatch(id, (data) => {
      setLiveData(data as LiveData);
      setIsLoading(false);
    });
    return unsub;
  }, [id]);

  if (isLoading || !liveData) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const { match, innings } = liveData;
  const quotaBalls = (tournament?.oversPerSide ?? 10) * 6;

  const inn1 = innings.find((i) => i.inningsNumber === 1);
  const inn2 = innings.find((i) => i.inningsNumber === 2);
  const current = inn2 ?? inn1;

  const teamOf = (teamId: string) => teams.find((t) => t.id === teamId) ?? null;

  const target = inn1 && inn2 ? inn1.runs + 1 : null;
  const runsNeeded = target && inn2 ? Math.max(target - inn2.runs, 0) : null;
  const ballsRemaining = inn2 ? Math.max(quotaBalls - inn2.balls, 0) : null;
  const rrr =
    runsNeeded !== null && ballsRemaining && ballsRemaining > 0
      ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
      : null;
  const crr =
    current && current.balls > 0
      ? ((current.runs / current.balls) * 6).toFixed(2)
      : "0.00";

  const currentBatsmen =
    current?.batting.filter((b) => !b.isOut && (b.balls > 0 || b.runs > 0)) ?? [];
  const fallOfWickets =
    current?.batting
      .filter((b) => b.isOut)
      .map((b) => ({ name: b.playerName ?? "Unknown", runs: b.runs, dismissal: b.dismissal })) ?? [];

  const teamName = (teamId: string) => teamOf(teamId)?.name ?? "Team";

  const inningsView: InningsData[] = innings.map((inn) => ({
    ...inn,
    battingTeamName: `${teamName(inn.battingTeamId)} Innings`,
    batting: inn.batting.map((b) => ({ ...b, playerName: b.playerName ?? "Unknown" })),
    bowling: inn.bowling.map((b) => ({ ...b, playerName: b.playerName ?? "Unknown" })),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Live hero */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm uppercase tracking-wide text-emerald-200/80 font-medium">
            {match.stage === "FINAL" ? "🏆 Final" : `Match ${match.matchNumber}`} ·{" "}
            {match.day}
          </span>
          <Badge
            className={
              match.status === "LIVE"
                ? "bg-red-500 text-white gap-1.5"
                : "bg-white/10 text-white"
            }
          >
            {match.status === "LIVE" && (
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            )}
            {match.status.replace("_", " ")}
          </Badge>
        </div>

        <div className="space-y-5">
          {[inn1, inn2].filter(Boolean).map((inn) => {
            const team = teamOf(inn!.battingTeamId);
            return (
              <div key={inn!.id} className="flex items-center gap-4">
                <TeamBadge shortName={team?.shortName ?? "?"} logoUrl={team?.logoUrl} />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-100">{team?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-extrabold font-mono">
                    {inn!.runs}/{inn!.wickets}
                  </p>
                  <p className="text-sm text-emerald-200/80">
                    {ballsToOversText(inn!.balls)} overs
                  </p>
                </div>
              </div>
            );
          })}
          {!inn1 && (
            <p className="text-emerald-100/80 text-center py-4">
              Match has not started yet. Check back soon.
            </p>
          )}
        </div>

        {target !== null && inn2 && match.status === "LIVE" && (
          <div className="mt-6 pt-5 border-t border-white/15 flex flex-wrap justify-center gap-x-8 gap-y-2 text-center">
            <div>
              <p className="text-2xl font-bold">{target}</p>
              <p className="text-xs text-emerald-200/80">TARGET</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {runsNeeded} <span className="text-sm font-normal">off {ballsRemaining}</span>
              </p>
              <p className="text-xs text-emerald-200/80">REQUIRED</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{crr}</p>
              <p className="text-xs text-emerald-200/80">CRR</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-300">{rrr ?? "—"}</p>
              <p className="text-xs text-emerald-200/80">RRR</p>
            </div>
          </div>
        )}
        {match.resultText && (
          <p className="mt-6 pt-4 border-t border-white/15 text-center text-xl font-bold text-amber-300">
            {match.resultText}
          </p>
        )}
      </div>

      {/* Current batsmen + bowlers */}
      {current && match.status === "LIVE" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              At the crease
            </h3>
            {currentBatsmen.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2">
                {currentBatsmen.map((b) => (
                  <div key={b.playerId} className="flex justify-between text-sm">
                    <span className="font-medium">{b.playerName ?? "—"}</span>
                    <span className="font-mono">
                      {b.runs} ({b.balls})
                    </span>
                  </div>
                ))}
              </div>
            )}
            {currentBatsmen.length === 2 && (
              <p className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Partnership: {currentBatsmen.reduce((s, b) => s + b.runs, 0)} runs off{" "}
                {currentBatsmen.reduce((s, b) => s + b.balls, 0)} balls
              </p>
            )}
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Bowling
            </h3>
            {current.bowling.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-2">
                {current.bowling.map((b) => (
                  <div key={b.playerId} className="flex justify-between text-sm">
                    <span className="font-medium">{b.playerName ?? "—"}</span>
                    <span className="font-mono">
                      {b.wickets}/{b.runs} ({ballsToOversText(b.balls)})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fall of wickets */}
      {fallOfWickets.length > 0 && (
        <div className="rounded-xl border p-4">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            Fall of Wickets
          </h3>
          <div className="flex flex-wrap gap-2">
            {fallOfWickets.map((w, i) => (
              <Badge key={i} variant="secondary" className="font-normal">
                {i + 1}. {w.name} ({w.runs})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {inningsView.map((inn) => (
        <ScorecardView key={inn.id} innings={inn} />
      ))}

      <p className="text-center text-xs text-muted-foreground">
        Live page updates automatically via real-time Firestore.
      </p>
    </div>
  );
}
