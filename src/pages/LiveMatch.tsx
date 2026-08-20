import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournament, getPlayers } from "@/lib/queries";
import { subscribeToMatch } from "@/lib/queries";
import { TeamBadge } from "@/components/TeamBadge";
import { ScorecardView, type InningsData } from "@/components/ScorecardView";
import { RecentBalls } from "@/components/RecentBalls";
import { EventAnimationOverlay } from "@/components/EventAnimationOverlay";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ballsToOversText, formatMatchDay } from "@/lib/cricket";
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

  const playerName = (id: string) =>
    (allPlayers ?? []).find((p) => p.id === id)?.name ?? "Player";

  const currentBatsmen =
    current?.batting
      .filter((b) => !b.isOut && (b.balls > 0 || b.runs > 0))
      .map((b) => ({
        ...b,
        playerName: b.playerName && b.playerName !== "Unknown" ? b.playerName : playerName(b.playerId),
      })) ?? [];

  const fallOfWickets =
    current?.batting
      .filter((b) => b.isOut)
      .map((b) => ({
        name: b.playerName && b.playerName !== "Unknown" ? b.playerName : playerName(b.playerId),
        runs: b.runs,
        dismissal: b.dismissal,
      })) ?? [];

  const teamName = (teamId: string) => teamOf(teamId)?.name ?? "Team";

  const inningsView: InningsData[] = innings.map((inn) => ({
    ...inn,
    battingTeamName: `${teamName(inn.battingTeamId)} Innings`,
    batting: inn.batting.map((b) => ({
      ...b,
      playerName: b.playerName && b.playerName !== "Unknown" ? b.playerName : playerName(b.playerId),
    })),
    bowling: inn.bowling.map((b) => ({
      ...b,
      playerName: b.playerName && b.playerName !== "Unknown" ? b.playerName : playerName(b.playerId),
    })),
  }));

  // Squad filtering for Team A & Team B
  const teamAPlayers = (allPlayers ?? []).filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = (allPlayers ?? []).filter((p) => p.teamId === match.teamBId);

  // Playing VI lineup (6 playing + 1 reserve) — ONLY when match has confirmed lineup
  const getLineup = (
    teamSquad: Player[],
    playingVIIds?: string[],
    reserveId?: string | null,
  ) => {
    const hasConfirmed = Array.isArray(playingVIIds) && playingVIIds.length > 0;
    if (hasConfirmed) {
      const playingList = playingVIIds
        .map((pid) => teamSquad.find((p) => p.id === pid))
        .filter((p): p is Player => p !== undefined);
      const reservePlayer = reserveId ? teamSquad.find((p) => p.id === reserveId) ?? null : null;
      return { hasConfirmed: true, playingList, reservePlayer, fullSquad: teamSquad };
    }

    return {
      hasConfirmed: false,
      playingList: [],
      reservePlayer: null,
      fullSquad: teamSquad,
    };
  };

  const lineupA = getLineup(teamAPlayers, match.teamAPlayingVI, match.teamAReserveId);
  const lineupB = getLineup(teamBPlayers, match.teamBPlayingVI, match.teamBReserveId);

  const playerOfMatch = match.playerOfMatchId
    ? players.find((p) => p.id === match.playerOfMatchId)
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Live Event Celebratory Overlay (4s, 6s, Wickets) */}
      <EventAnimationOverlay event={match.recentEvent} />

      {/* Live Match Hero Card */}
      <Card className="border shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {match.status === "COMPLETED" ? (
              <Badge className="bg-emerald-600 text-white font-bold flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" />
                MATCH COMPLETED
              </Badge>
            ) : (
              <Badge variant="destructive" className="animate-pulse flex items-center gap-1.5 font-bold">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                LIVE MATCH
              </Badge>
            )}
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              {match.stage === "FINAL" ? "🏆 Final" : `Match ${match.matchNumber}`} · {formatMatchDay(match.day, match.date)}
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

          {/* Grand Match Result Banner for Completed Matches */}
          {match.resultText && (
            <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border-2 border-emerald-500/40 text-center shadow-lg shadow-emerald-950/30 space-y-2">
              <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs tracking-wider uppercase">
                <Trophy className="h-3.5 w-3.5" /> Official Match Result
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-emerald-400 uppercase tracking-tight">
                {match.resultText}
              </h3>
              {playerOfMatch && (
                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-center gap-2">
                  <Badge className="bg-amber-500 text-slate-950 font-extrabold gap-1.5 py-1 px-3 shadow-sm">
                    <Award className="h-3.5 w-3.5" /> Player of the Match: {playerOfMatch.name}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Rates banner (if live) */}
          {match.status === "LIVE" && (
            <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between text-xs sm:text-sm font-mono text-muted-foreground gap-2">
              <span>CRR: <strong className="text-foreground">{crr}</strong></span>
              {rrr && <span>RRR: <strong className="text-foreground">{rrr}</strong></span>}
              {runsNeeded !== null && ballsRemaining !== null && (
                <span className="text-primary font-bold">
                  Need {runsNeeded} runs from {ballsRemaining} balls
                </span>
              )}
            </div>
          )}

          {/* Recent Deliveries with Over-by-Over Separation */}
          {current?.recentBalls && current.recentBalls.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Recent Deliveries (Over by Over)
                </span>
                <span className="text-[10px] text-muted-foreground">Live Delivery Feed</span>
              </div>
              <RecentBalls balls={current.recentBalls} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Live Scorecard vs Playing VI */}
      <Tabs defaultValue="scorecard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scorecard" className="text-xs sm:text-sm font-bold gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" /> Live Scorecard
          </TabsTrigger>
          <TabsTrigger value="lineup" className="text-xs sm:text-sm font-bold gap-1.5">
            <Users className="h-4 w-4 text-emerald-500" />
            {lineupA.hasConfirmed || lineupB.hasConfirmed ? "Playing VI" : "Squads"}
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

          {inningsView.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Scorecard is initializing...
            </Card>
          ) : (
            inningsView.map((inn) => (
              <ScorecardView key={inn.id} innings={inn} squadPlayers={allPlayers ?? []} />
            ))
          )}
        </TabsContent>

        {/* Playing VI Tab */}
        <TabsContent value="lineup" className="mt-4 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Team A */}
            <Card className="border shadow-sm">
              <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TeamBadge shortName={teamA?.shortName ?? "TBD"} logoUrl={teamA?.logoUrl} size="sm" />
                    <CardTitle className="text-sm font-bold">{teamA?.name ?? "Team A"} {lineupA.hasConfirmed ? "Lineup" : "Squad"}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {lineupA.hasConfirmed ? "6 Playing + 1 Reserve" : `${lineupA.fullSquad.length} Squad Players`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {lineupA.hasConfirmed ? (
                  <>
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

                    {lineupA.reservePlayer && (
                      <div className="pt-2 border-t space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Match Reserve Player (1)
                        </span>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                          <span className="font-semibold">{lineupA.reservePlayer.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{lineupA.reservePlayer.role}</Badge>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-sky-500" /> Full Team Squad ({lineupA.fullSquad.length})
                    </span>
                    {lineupA.fullSquad.map((p, idx) => (
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
                    <p className="text-[11px] text-muted-foreground pt-1 italic">
                      * Starting Playing VI (6) and Reserve (1) are decided at match toss.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team B */}
            <Card className="border shadow-sm">
              <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TeamBadge shortName={teamB?.shortName ?? "TBD"} logoUrl={teamB?.logoUrl} size="sm" />
                    <CardTitle className="text-sm font-bold">{teamB?.name ?? "Team B"} {lineupB.hasConfirmed ? "Lineup" : "Squad"}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {lineupB.hasConfirmed ? "6 Playing + 1 Reserve" : `${lineupB.fullSquad.length} Squad Players`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {lineupB.hasConfirmed ? (
                  <>
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

                    {lineupB.reservePlayer && (
                      <div className="pt-2 border-t space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Match Reserve Player (1)
                        </span>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                          <span className="font-semibold">{lineupB.reservePlayer.name}</span>
                          <Badge variant="secondary" className="text-[10px]">{lineupB.reservePlayer.role}</Badge>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-sky-500" /> Full Team Squad ({lineupB.fullSquad.length})
                    </span>
                    {lineupB.fullSquad.map((p, idx) => (
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
                    <p className="text-[11px] text-muted-foreground pt-1 italic">
                      * Starting Playing VI (6) and Reserve (1) are decided at match toss.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
