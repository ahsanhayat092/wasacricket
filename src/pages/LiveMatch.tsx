import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournament, getPlayers } from "@/lib/queries";
import { subscribeToMatch } from "@/lib/queries";
import { TeamBadge } from "@/components/TeamBadge";
import { ScorecardView, type InningsData } from "@/components/ScorecardView";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ballsToOversText } from "@/lib/cricket";
import type { Match, Innings, BattingScore, BowlingScore, Team, Player } from "@/lib/firestore";
import { getSchedule } from "@/lib/queries";
import { Trophy, Users, ArrowRightLeft, Zap } from "lucide-react";

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

  const { data: allPlayers } = useQuery({
    queryKey: ["players"],
    queryFn: getPlayers,
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
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const { match, innings } = liveData;
  const isFinal = match.stage === "FINAL";
  const matchOvers = isFinal ? 5 : (match.oversPerSide ?? 4);
  const quotaBalls = matchOvers * 6;

  const inn1 = innings.find((i) => i.inningsNumber === 1);
  const inn2 = innings.find((i) => i.inningsNumber === 2);
  const current = inn2 ?? inn1;

  const teamOf = (teamId: string) => teams.find((t) => t.id === teamId) ?? null;
  const teamA = teamOf(match.teamAId ?? "");
  const teamB = teamOf(match.teamBId ?? "");

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

  // Squad filtering for Team A & Team B
  const teamAPlayers = (allPlayers ?? []).filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = (allPlayers ?? []).filter((p) => p.teamId === match.teamBId);

  // Playing VI lineup (6 playing + 1 reserve)
  const getLineup = (
    teamSquad: Player[],
    playingVIIds?: string[],
    reserveId?: string | null,
  ) => {
    let playingList: Player[] = [];
    let reservePlayer: Player | null = null;

    if (playingVIIds && playingVIIds.length > 0) {
      playingList = playingVIIds
        .map((pid) => teamSquad.find((p) => p.id === pid))
        .filter((p): p is Player => p !== undefined);
      reservePlayer = reserveId ? teamSquad.find((p) => p.id === reserveId) ?? null : null;
    } else {
      playingList = teamSquad.slice(0, 6);
      reservePlayer = teamSquad[6] ?? null;
    }

    return { playingList, reservePlayer };
  };

  const lineupA = getLineup(teamAPlayers, match.teamAPlayingVI, match.teamAReserveId);
  const lineupB = getLineup(teamBPlayers, match.teamBPlayingVI, match.teamBReserveId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Live Match Hero Card */}
      <Card className="border shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="destructive" className="animate-pulse flex items-center gap-1.5 font-bold">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
              LIVE MATCH
            </Badge>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              {match.stage === "FINAL" ? "🏆 Final" : `Match ${match.matchNumber}`} · {match.day}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <TeamBadge shortName={teamA?.shortName ?? "TBD"} logoUrl={teamA?.logoUrl} size="lg" />
              <span className="font-extrabold text-base sm:text-lg">{teamA?.name ?? "Rank 1"}</span>
              {inn1?.battingTeamId === teamA?.id && (
                <span className="font-mono text-xl sm:text-2xl font-black">
                  {inn1.runs}/{inn1.wickets}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({ballsToOversText(inn1.balls)} ov)
                  </span>
                </span>
              )}
              {inn2?.battingTeamId === teamA?.id && (
                <span className="font-mono text-xl sm:text-2xl font-black">
                  {inn2.runs}/{inn2.wickets}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({ballsToOversText(inn2.balls)} ov)
                  </span>
                </span>
              )}
            </div>

            <div className="text-muted-foreground font-black text-sm px-2">VS</div>

            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <TeamBadge shortName={teamB?.shortName ?? "TBD"} logoUrl={teamB?.logoUrl} size="lg" />
              <span className="font-extrabold text-base sm:text-lg">{teamB?.name ?? "Rank 2"}</span>
              {inn1?.battingTeamId === teamB?.id && (
                <span className="font-mono text-xl sm:text-2xl font-black">
                  {inn1.runs}/{inn1.wickets}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({ballsToOversText(inn1.balls)} ov)
                  </span>
                </span>
              )}
              {inn2?.battingTeamId === teamB?.id && (
                <span className="font-mono text-xl sm:text-2xl font-black">
                  {inn2.runs}/{inn2.wickets}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({ballsToOversText(inn2.balls)} ov)
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Rates banner */}
          <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between text-xs sm:text-sm font-mono text-muted-foreground gap-2">
            <span>CRR: <strong className="text-foreground">{crr}</strong></span>
            {rrr && <span>RRR: <strong className="text-foreground">{rrr}</strong></span>}
            {runsNeeded !== null && ballsRemaining !== null && (
              <span className="text-primary font-bold">
                Need {runsNeeded} runs from {ballsRemaining} balls
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Live Scorecard vs Playing VI */}
      <Tabs defaultValue="scorecard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scorecard" className="text-xs sm:text-sm font-bold gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" /> Live Scorecard
          </TabsTrigger>
          <TabsTrigger value="lineup" className="text-xs sm:text-sm font-bold gap-1.5">
            <Users className="h-4 w-4 text-emerald-500" /> Playing VI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scorecard" className="mt-4 space-y-6">
          {/* Current batsmen + bowlers */}
          {current && match.status === "LIVE" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border p-4 bg-card shadow-sm">
                <h3 className="font-bold mb-3 text-xs uppercase tracking-wider text-amber-500">
                  🏏 At the crease
                </h3>
                {currentBatsmen.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Waiting for deliveries…</p>
                ) : (
                  <div className="space-y-2">
                    {currentBatsmen.map((b) => (
                      <div key={b.playerId} className="flex justify-between text-sm">
                        <span className="font-semibold">{b.playerName ?? "—"}</span>
                        <span className="font-mono font-bold text-amber-500">
                          {b.runs} ({b.balls}b)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-xl border p-4 bg-card shadow-sm">
                <h3 className="font-bold mb-3 text-xs uppercase tracking-wider text-sky-500">
                  🎯 Current Bowling
                </h3>
                {current.bowling.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Waiting for deliveries…</p>
                ) : (
                  <div className="space-y-2">
                    {current.bowling.map((b) => (
                      <div key={b.playerId} className="flex justify-between text-sm">
                        <span className="font-semibold">{b.playerName ?? "—"}</span>
                        <span className="font-mono font-bold text-sky-500">
                          {b.wickets}/{b.runs} ({ballsToOversText(b.balls)} ov)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full innings scorecards */}
          {inningsView.map((inn) => (
            <ScorecardView key={inn.id} innings={inn} squadPlayers={allPlayers} />
          ))}
        </TabsContent>

        {/* Playing VI Tab */}
        <TabsContent value="lineup" className="mt-4 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Team A Lineup */}
            <Card className="border shadow-sm">
              <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TeamBadge shortName={teamA?.shortName ?? "TBD"} logoUrl={teamA?.logoUrl} size="sm" />
                    <CardTitle className="text-sm font-bold">{teamA?.name ?? "Team A"} Lineup</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    6 Playing + 1 Reserve
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-500" /> Starting Playing VI (6)
                  </span>
                  {lineupA.playingList.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground w-4 text-center">{idx + 1}</span>
                        <span className="font-semibold">{p.name}</span>
                        {(p.isCaptain || p.designation === "Captain") && (
                          <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">(C)</Badge>
                        )}
                        {(p.isViceCaptain || p.designation === "Vice Captain") && (
                          <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold">(VC)</Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{p.role}</Badge>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Reserve Player (1)
                  </span>
                  {lineupA.reservePlayer ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                      <span className="font-semibold">{lineupA.reservePlayer.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{lineupA.reservePlayer.role}</Badge>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No reserve assigned.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Team B Lineup */}
            <Card className="border shadow-sm">
              <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TeamBadge shortName={teamB?.shortName ?? "TBD"} logoUrl={teamB?.logoUrl} size="sm" />
                    <CardTitle className="text-sm font-bold">{teamB?.name ?? "Team B"} Lineup</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    6 Playing + 1 Reserve
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-500" /> Starting Playing VI (6)
                  </span>
                  {lineupB.playingList.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground w-4 text-center">{idx + 1}</span>
                        <span className="font-semibold">{p.name}</span>
                        {(p.isCaptain || p.designation === "Captain") && (
                          <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">(C)</Badge>
                        )}
                        {(p.isViceCaptain || p.designation === "Vice Captain") && (
                          <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold">(VC)</Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{p.role}</Badge>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Reserve Player (1)
                  </span>
                  {lineupB.reservePlayer ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                      <span className="font-semibold">{lineupB.reservePlayer.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{lineupB.reservePlayer.role}</Badge>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No reserve assigned.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
