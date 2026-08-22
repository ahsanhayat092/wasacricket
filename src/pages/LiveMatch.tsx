import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getTournament, getPlayers } from "@/lib/queries";
import { subscribeToMatch } from "@/lib/queries";
import { TeamBadge } from "@/components/TeamBadge";
import {
  ScorecardView,
  PartnershipsSection,
  type InningsData,
} from "@/components/ScorecardView";
import { ManhattanGraph } from "@/components/ManhattanGraph";
import { RecentBalls } from "@/components/RecentBalls";
import { EventAnimationOverlay } from "@/components/EventAnimationOverlay";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ballsToOversText,
  formatMatchDay,
  formatMatchDateTime,
  getInningsPartnerships,
} from "@/lib/cricket";
import type { Match, Innings, BattingScore, BowlingScore, Team, Player } from "@/lib/firestore";
import { getSchedule } from "@/lib/queries";
import { Trophy, Users, ArrowRightLeft, Zap, BarChart3, ShieldAlert } from "lucide-react";

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
  const matchOvers = isFinal ? 5 : 4;
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

  const activePartnerships = current ? getInningsPartnerships(current, allPlayers ?? []) : [];
  const currentStand =
    activePartnerships.find((p) => p.isUnbroken) ??
    (activePartnerships.length > 0 ? activePartnerships[activePartnerships.length - 1] : null);

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
    bowling: inn.bowling
      .filter((b) => b.balls > 0 || b.wides > 0 || b.noBalls > 0 || b.runs > 0 || b.wickets > 0)
      .map((b) => ({
        ...b,
        playerName: b.playerName && b.playerName !== "Unknown" ? b.playerName : playerName(b.playerId),
      })),
  }));

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

  const lineupA = getLineup((allPlayers ?? []).filter((p) => p.teamId === match.teamAId), match.teamAPlayingVI, match.teamAReserveId);
  const lineupB = getLineup((allPlayers ?? []).filter((p) => p.teamId === match.teamBId), match.teamBPlayingVI, match.teamBReserveId);

  const playerOfMatch = match.playerOfMatchId
    ? (allPlayers ?? []).find((p) => p.id === match.playerOfMatchId)
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <EventAnimationOverlay event={match.recentEvent} />

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
              {match.stage === "FINAL" ? "🏆 Final" : `Match ${match.matchNumber}`} ·{" "}
              {formatMatchDateTime(match.day, match.date, match.time)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <TeamBadge shortName={teamA?.shortName ?? "TBD"} logoUrl={teamA?.logoUrl} size="lg" />
              <span className="font-extrabold text-base sm:text-lg">{teamA?.name ?? "Rank 1"}</span>
              {inn1?.battingTeamId === teamA?.id && (
                <span className="font-mono text-xl sm:text-2xl font-black">
                  {inn1.runs}/{Math.min(5, inn1.wickets)}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({ballsToOversText(inn1.balls)} ov)
                  </span>
                </span>
              )}
              {inn2?.battingTeamId === teamA?.id && (
                <span className="font-mono text-xl sm:text-2xl font-black">
                  {inn2.runs}/{Math.min(5, inn2.wickets)}{" "}
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
                  {inn1.runs}/{Math.min(5, inn1.wickets)}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({ballsToOversText(inn1.balls)} ov)
                  </span>
                </span>
              )}
              {inn2?.battingTeamId === teamB?.id && (
                <span className="font-mono text-xl sm:text-2xl font-black">
                  {inn2.runs}/{Math.min(5, inn2.wickets)}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({ballsToOversText(inn2.balls)} ov)
                  </span>
                </span>
              )}
            </div>
          </div>

          {match.resultText && (
            <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border-2 border-emerald-500/40 text-center shadow-lg shadow-emerald-950/30 space-y-3">
              <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs tracking-wider uppercase">
                <Trophy className="h-3.5 w-3.5" /> Official Match Result
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-emerald-400 uppercase tracking-tight">
                {match.resultText}
              </h3>
              {playerOfMatch && (
                <div className="pt-3 border-t border-emerald-500/20 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <PlayerAvatar
                    name={playerOfMatch.name}
                    photoUrl={playerOfMatch.photoUrl}
                    size="lg"
                    className="ring-2 ring-amber-400 shadow-md"
                  />
                  <div className="text-center sm:text-left">
                    <Badge className="bg-amber-500 text-slate-950 font-black gap-1.5 py-1 px-3 shadow-sm text-xs">
                      <Award className="h-3.5 w-3.5" /> Player of the Match
                    </Badge>
                    <p className="text-base sm:text-lg font-black text-foreground mt-0.5">
                      {playerOfMatch.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {playerOfMatch.role}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rates banner (if live) */}
          {match.status === "LIVE" && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-mono text-muted-foreground gap-2">
                <span>CRR: <strong className="text-foreground">{crr}</strong></span>
                {rrr && <span>RRR: <strong className="text-foreground">{rrr}</strong></span>}
                {runsNeeded !== null && ballsRemaining !== null && (
                  <span className="text-primary font-bold">
                    Need {runsNeeded} runs from {ballsRemaining} balls
                  </span>
                )}
              </div>

              {currentStand && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500 text-slate-950 font-black text-[10px] gap-1 px-2 py-0.5">
                      <Users className="h-3 w-3" /> Current Stand
                    </Badge>
                    <span className="font-bold text-foreground">
                      {currentStand.player1Name} ({currentStand.player1Runs}) & {currentStand.player2Name} ({currentStand.player2Runs})
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold">
                    <span className="font-black text-amber-400 text-sm">{currentStand.totalRuns} runs</span>
                    <span className="text-muted-foreground ml-1">({currentStand.totalBalls} balls)</span>
                  </div>
                </div>
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
              <RecentBalls balls={current.recentBalls} maxOversToShow={isFinal ? 5 : 4} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: Live Scorecard vs Partnerships vs Manhattan vs Playing VI */}
      <Tabs defaultValue="scorecard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="scorecard" className="text-xs sm:text-sm font-bold gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" /> Scorecard
          </TabsTrigger>
          <TabsTrigger value="partnerships" className="text-xs sm:text-sm font-bold gap-1.5">
            <Users className="h-4 w-4 text-amber-500" /> Partnerships
          </TabsTrigger>
          <TabsTrigger value="manhattan" className="text-xs sm:text-sm font-bold gap-1.5">
            <BarChart3 className="h-4 w-4 text-indigo-400" /> Manhattan
          </TabsTrigger>
          <TabsTrigger value="lineup" className="text-xs sm:text-sm font-bold gap-1.5">
            <ShieldAlert className="h-4 w-4 text-emerald-500" />
            {lineupA.hasConfirmed || lineupB.hasConfirmed ? "Playing VI" : "Squads"}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Partnerships */}
        <TabsContent value="partnerships" className="mt-4 space-y-6">
          {inningsView.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Waiting for match data...
            </Card>
          ) : (
            inningsView.map((inn) => (
              <PartnershipsSection
                key={`part-${inn.id}`}
                innings={inn}
                squadPlayers={allPlayers ?? []}
              />
            ))
          )}
        </TabsContent>

        {/* Tab: Manhattan Graph */}
        <TabsContent value="manhattan" className="mt-4 space-y-6">
          <ManhattanGraph
            inn1={inn1}
            inn2={inn2}
            teamA={teamA}
            teamB={teamB}
            maxOvers={isFinal ? 5 : 4}
          />
        </TabsContent>

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
                    {currentBatsmen.map((b) => {
                      const isOnStrike =
                        (b as { isOnStrike?: boolean }).isOnStrike ||
                        b.playerId === (current as unknown as { strikerId?: string })?.strikerId ||
                        b.playerId === (current as unknown as { currentStrikerId?: string })?.currentStrikerId;
                      return (
                        <div key={b.playerId} className="flex justify-between text-sm">
                          <span className="font-semibold flex items-center gap-1">
                            {isOnStrike && (
                              <span className="text-amber-500 font-black text-sm leading-none">*</span>
                            )}
                            {b.playerName ?? "—"}
                          </span>
                          <span className="font-mono font-bold text-amber-500">
                            {b.runs} ({b.balls}b)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="rounded-xl border p-4 bg-card shadow-sm">
                <h3 className="font-bold mb-3 text-xs uppercase tracking-wider text-sky-500">
                  🎯 Current Bowling
                </h3>
                {(() => {
                  const activeBowlers = current.bowling.filter(
                    (b) => b.balls > 0 || b.wides > 0 || b.noBalls > 0 || b.runs > 0 || b.wickets > 0,
                  );
                  const currentBowlerId = (current as unknown as { currentBowlerId?: string | null })?.currentBowlerId;

                  // Exactly 1 bowler who is currently bowling
                  let currentBowler = currentBowlerId
                    ? current.bowling.find((b) => b.playerId === currentBowlerId) ?? null
                    : null;

                  if (!currentBowler && activeBowlers.length > 0) {
                    // Fallback to the bowler who delivered the latest ball in this innings
                    currentBowler = activeBowlers[activeBowlers.length - 1];
                  }

                  if (!currentBowler) {
                    return <p className="text-xs text-muted-foreground">Waiting for deliveries…</p>;
                  }

                  const econ =
                    currentBowler.balls > 0
                      ? ((currentBowler.runs / currentBowler.balls) * 6).toFixed(2)
                      : "0.00";

                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0 animate-pulse" />
                          {currentBowler.playerName ?? "—"}
                        </span>
                        <span className="font-mono font-bold text-sky-500">
                          {currentBowler.wickets}/{currentBowler.runs}{" "}
                          <span className="text-xs text-muted-foreground font-normal">
                            ({ballsToOversText(currentBowler.balls)} ov, Econ {econ})
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {inningsView.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Scorecard is initializing...
            </Card>
          ) : (
            inningsView.map((inn) => (
              <ScorecardView
                key={inn.id}
                innings={inn}
                squadPlayers={allPlayers ?? []}
                showPartnerships={false}
              />
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
                            <span className="font-mono text-muted-foreground w-3 text-center text-[10px]">{idx + 1}</span>
                            <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
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
                          <div className="flex items-center gap-2">
                            <PlayerAvatar name={lineupA.reservePlayer.name} photoUrl={lineupA.reservePlayer.photoUrl} size="xs" />
                            <span className="font-semibold">{lineupA.reservePlayer.name}</span>
                            <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500">
                              Reserve
                            </Badge>
                          </div>
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
                          <span className="font-mono text-muted-foreground w-3 text-center text-[10px]">{idx + 1}</span>
                          <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
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
                            <span className="font-mono text-muted-foreground w-3 text-center text-[10px]">{idx + 1}</span>
                            <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
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
                          <div className="flex items-center gap-2">
                            <PlayerAvatar name={lineupB.reservePlayer.name} photoUrl={lineupB.reservePlayer.photoUrl} size="xs" />
                            <span className="font-semibold">{lineupB.reservePlayer.name}</span>
                            <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500">
                              Reserve
                            </Badge>
                          </div>
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
                          <span className="font-mono text-muted-foreground w-3 text-center text-[10px]">{idx + 1}</span>
                          <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
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
