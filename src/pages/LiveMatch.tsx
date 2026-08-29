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
import { EventAnimationOverlay, type EventData } from "@/components/EventAnimationOverlay";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";
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
import { StoryCardModal } from "@/components/StoryCardModal";
import { BroadcastModal } from "@/components/BroadcastModal";
import { Button } from "@/components/ui/button";
import type { Match, Innings, BattingScore, BowlingScore, Team, Player } from "@/lib/firestore";
import { getSchedule } from "@/lib/queries";
import { triggerChampionConfetti } from "@/lib/confetti";
import {
  Trophy,
  Users,
  ArrowRightLeft,
  Zap,
  BarChart3,
  ShieldAlert,
  Camera,
  Award,
  MapPin,
  Clock,
  Flame,
  Activity,
  Crown,
  PartyPopper,
  MessageCircle,
  Tv,
} from "lucide-react";

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
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [manualEvent, setManualEvent] = useState<EventData | null>(null);
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
      if (data?.match?.stage === "FINAL" && data?.match?.status === "COMPLETED") {
        setTimeout(() => triggerChampionConfetti(), 600);
      }
    });
    return unsub;
  }, [id]);

  if (isLoading || !liveData) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const { match, innings } = liveData;
  const isFinal = match.stage === "FINAL" || match.stage?.toUpperCase() === "FINAL";
  const isPlayoff = match.stage === "PLAYOFF" || match.stage?.toUpperCase() === "PLAYOFF";
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
      .filter((b) => !b.isOut && (b.balls > 0 || b.runs > 0 || (current as any).strikerId === b.playerId || (current as any).nonStrikerId === b.playerId))
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
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6 space-y-6">
      <EventAnimationOverlay
        event={manualEvent ?? match.recentEvent}
        onDismiss={() => setManualEvent(null)}
      />

      {/* Main Broadcast Grid: Left Main Area (8 Cols) + Right Match Center Hub (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Hero Scoreboard + Visual Feeds + Scorecard Tabs */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Hero Scoreboard Card */}
          <Card className="border shadow-xl bg-card overflow-hidden">
            <CardContent className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b pb-3">
                <div className="flex items-center gap-2">
                  {match.status === "COMPLETED" ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold flex items-center gap-1.5 px-3 py-1">
                      <Trophy className="h-3.5 w-3.5" />
                      MATCH COMPLETED
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="animate-pulse flex items-center gap-1.5 font-bold px-3 py-1">
                      <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                      LIVE MATCH
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStoryModalOpen(true)}
                    className="h-7 text-xs font-bold gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 rounded-lg px-2.5"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Story Card</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBroadcastModalOpen(true)}
                    className="h-7 text-xs font-bold gap-1.5 border-red-500/40 text-red-500 hover:bg-red-500/10 rounded-lg px-2.5"
                  >
                    <Tv className="h-3.5 w-3.5" />
                    <span>OBS Overlay</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const shareUrl = window.location.href;
                      const text = encodeURIComponent(
                        `🏏 *${teamA?.name ?? "Team A"} vs ${teamB?.name ?? "Team B"}*\n${match.resultText ? `🏆 *Result:* ${match.resultText}\n` : ""}\n👉 *Follow Live Ball-by-Ball Scorecard:* ${shareUrl}`
                      );
                      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
                    }}
                    className="h-7 text-xs font-bold gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg px-2.5 shadow-sm"
                  >
                    <MessageCircle className="h-3.5 w-3.5 fill-white" />
                    <span>WhatsApp</span>
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                  <span className={match.stage === "FINAL" ? "text-amber-500 font-extrabold" : match.stage === "PLAYOFF" ? "text-purple-400 font-extrabold" : "text-amber-500 font-extrabold"}>
                    {match.stage === "FINAL" ? "🏆 Grand Final" : match.stage === "PLAYOFF" ? "⚔️ Playoff Match" : `Match #${match.matchNumber}`}
                  </span>
                  <span>•</span>
                  <span>{formatMatchDateTime(match.day, match.date, match.time)}</span>
                </div>
              </div>

              {/* Team Showdown */}
              <div className="flex items-center justify-between gap-4 py-2">
                {/* Team A */}
                <div className="flex flex-col items-center gap-2 flex-1 text-center">
                  <TeamBadge shortName={teamA?.shortName ?? "TBD"} logoUrl={teamA?.logoUrl} size="lg" />
                  <span className="font-black text-base sm:text-xl tracking-tight">
                    {teamA?.name ?? (isFinal ? "TBD (Rank 1)" : isPlayoff ? "TBD (Rank 2)" : "TBD")}
                  </span>
                  {inn1?.battingTeamId === teamA?.id && (
                    <div className="font-mono">
                      <span className="text-2xl sm:text-3xl font-black text-foreground">
                        {inn1.runs}/{Math.min(6, inn1.wickets)}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal ml-1.5">
                        ({ballsToOversText(inn1.balls)} ov)
                      </span>
                    </div>
                  )}
                  {inn2?.battingTeamId === teamA?.id && (
                    <div className="font-mono">
                      <span className="text-2xl sm:text-3xl font-black text-foreground">
                        {inn2.runs}/{Math.min(6, inn2.wickets)}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal ml-1.5">
                        ({ballsToOversText(inn2.balls)} ov)
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-muted-foreground/60 font-black text-base sm:text-lg px-2">VS</div>

                {/* Team B */}
                <div className="flex flex-col items-center gap-2 flex-1 text-center">
                  <TeamBadge shortName={teamB?.shortName ?? "TBD"} logoUrl={teamB?.logoUrl} size="lg" />
                  <span className="font-black text-base sm:text-xl tracking-tight">
                    {teamB?.name ?? (isFinal ? "TBD (Playoff Winner)" : isPlayoff ? "TBD (Rank 3)" : "TBD")}
                  </span>
                  {inn1?.battingTeamId === teamB?.id && (
                    <div className="font-mono">
                      <span className="text-2xl sm:text-3xl font-black text-foreground">
                        {inn1.runs}/{Math.min(6, inn1.wickets)}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal ml-1.5">
                        ({ballsToOversText(inn1.balls)} ov)
                      </span>
                    </div>
                  )}
                  {inn2?.battingTeamId === teamB?.id && (
                    <div className="font-mono">
                      <span className="text-2xl sm:text-3xl font-black text-foreground">
                        {inn2.runs}/{Math.min(6, inn2.wickets)}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal ml-1.5">
                        ({ballsToOversText(inn2.balls)} ov)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Match Result / Tournament Champions Banner (if completed) */}
              {match.resultText && (
                <div
                  className={`mt-6 p-5 sm:p-7 rounded-3xl border-2 text-center shadow-2xl space-y-4 ${
                    isFinal
                      ? "bg-gradient-to-br from-amber-950/70 via-slate-950 to-amber-950/80 border-amber-500/60 shadow-amber-950/50"
                      : "bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border-emerald-500/40 shadow-emerald-950/30"
                  }`}
                >
                  {isFinal ? (
                    <div className="space-y-3">
                      <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/25 border-2 border-amber-400/50 text-amber-300 font-black text-xs sm:text-sm tracking-widest uppercase shadow-md animate-bounce">
                        <Crown className="h-4 w-4 text-amber-400" />
                        <span>TOURNAMENT CHAMPIONS • WASA PREMIER LEAGUE 2026</span>
                        <Trophy className="h-4 w-4 text-amber-400" />
                      </div>

                      <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 via-amber-300 to-amber-500 drop-shadow">
                        🏆 {match.resultText}
                      </h3>

                      <div className="pt-1 flex items-center justify-center gap-2">
                        <Button
                          onClick={triggerChampionConfetti}
                          size="sm"
                          className="font-black text-xs bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 hover:from-amber-400 hover:to-yellow-300 shadow-md gap-1.5"
                        >
                          <PartyPopper className="h-3.5 w-3.5" />
                          <span>Celebrate Victory! 🎉</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs tracking-wider uppercase">
                        <Trophy className="h-3.5 w-3.5" /> Official Match Result
                      </div>
                      <h3 className="text-lg sm:text-2xl font-black text-emerald-400 uppercase tracking-tight">
                        {match.resultText}
                      </h3>
                    </div>
                  )}

                  {playerOfMatch && (
                    <div className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-center gap-3 ${isFinal ? "border-amber-500/30" : "border-emerald-500/20"}`}>
                      <PlayerAvatar
                        name={playerOfMatch.name}
                        photoUrl={playerOfMatch.photoUrl}
                        size="lg"
                        className="ring-2 ring-amber-400 shadow-md"
                      />
                      <div className="text-center sm:text-left">
                        <Badge className="bg-amber-500 text-slate-950 font-black gap-1.5 py-1 px-3 shadow-sm text-xs">
                          <Award className="h-3.5 w-3.5" /> Player of the {isFinal ? "Grand Final" : "Match"}
                        </Badge>
                        <p className="text-base sm:text-lg font-black text-foreground mt-0.5">
                          <PlayerLink playerId={playerOfMatch.id} name={playerOfMatch.name} />
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {playerOfMatch.role}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Live Rates & Target Bar */}
              {match.status === "LIVE" && (
                <div className="mt-5 pt-4 border-t space-y-3">
                  <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-mono text-muted-foreground gap-2">
                    <span>CRR: <strong className="text-emerald-400 text-base">{crr}</strong></span>
                    {rrr && <span>RRR: <strong className="text-amber-400 text-base">{rrr}</strong></span>}
                    {runsNeeded !== null && ballsRemaining !== null && (
                      <span className="text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                        Need {runsNeeded} runs from {ballsRemaining} balls
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Deliveries with Over-by-Over Separation */}
              {current?.recentBalls && current.recentBalls.length > 0 && (
                <div className="mt-5 pt-4 border-t space-y-2">
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

          {/* Detailed Match Tabs (Scorecard, Partnerships, Manhattan, Squads) */}
          <Tabs defaultValue="scorecard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-11">
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

            {/* Tab: Scorecard */}
            <TabsContent value="scorecard" className="mt-4 space-y-6">
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

            {/* Tab: Playing VI / Squads */}
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
                                <PlayerLink playerId={p.id} name={p.name} className="font-semibold" />
                                {(p.isCaptain || p.designation === "Captain") && (
                                  <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">(C)</Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">{p.role}</span>
                            </div>
                          ))}
                        </div>

                        {lineupA.reservePlayer && (
                          <div className="pt-2 border-t space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Designated Reserve (1)
                            </span>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                              <div className="flex items-center gap-2">
                                <PlayerAvatar name={lineupA.reservePlayer.name} photoUrl={lineupA.reservePlayer.photoUrl} size="xs" />
                                <PlayerLink playerId={lineupA.reservePlayer.id} name={lineupA.reservePlayer.name} className="font-semibold text-amber-400" />
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">{lineupA.reservePlayer.role}</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-1.5">
                        {lineupA.fullSquad.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                            <div className="flex items-center gap-2">
                              <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
                              <PlayerLink playerId={p.id} name={p.name} className="font-semibold" />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">{p.role}</span>
                          </div>
                        ))}
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
                                <PlayerLink playerId={p.id} name={p.name} className="font-semibold" />
                                {(p.isCaptain || p.designation === "Captain") && (
                                  <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">(C)</Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">{p.role}</span>
                            </div>
                          ))}
                        </div>

                        {lineupB.reservePlayer && (
                          <div className="pt-2 border-t space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Designated Reserve (1)
                            </span>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                              <div className="flex items-center gap-2">
                                <PlayerAvatar name={lineupB.reservePlayer.name} photoUrl={lineupB.reservePlayer.photoUrl} size="xs" />
                                <PlayerLink playerId={lineupB.reservePlayer.id} name={lineupB.reservePlayer.name} className="font-semibold text-amber-400" />
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">{lineupB.reservePlayer.role}</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-1.5">
                        {lineupB.fullSquad.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                            <div className="flex items-center gap-2">
                              <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
                              <PlayerLink playerId={p.id} name={p.name} className="font-semibold" />
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">{p.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Live Crease & Match Center Hub */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* Live Crease (Batters & Bowler) Card */}
          {current && match.status === "LIVE" && (
            <Card className="border shadow-lg bg-card overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b bg-muted/30">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" /> Live Match Center
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Batters at Crease */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    🏏 Batters At Crease
                  </span>
                  {currentBatsmen.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Waiting for deliveries…</p>
                  ) : (
                    <div className="space-y-1.5">
                      {currentBatsmen.map((b) => {
                        const isOnStrike =
                          (b as { isOnStrike?: boolean }).isOnStrike ||
                          b.playerId === (current as unknown as { strikerId?: string })?.strikerId ||
                          b.playerId === (current as unknown as { currentStrikerId?: string })?.currentStrikerId;
                        const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0";
                        return (
                          <div
                            key={b.playerId}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                              isOnStrike ? "bg-amber-500/10 border-amber-500/40 shadow-sm" : "bg-muted/20 border-border/40"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold flex items-center gap-1">
                                {isOnStrike && <span className="text-amber-500 font-black text-sm leading-none">*</span>}
                                <PlayerLink playerId={b.playerId} name={b.playerName ?? "—"} />
                              </span>
                              {isOnStrike && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500 text-amber-400 font-bold">
                                  STRIKER
                                </Badge>
                              )}
                            </div>
                            <div className="text-right font-mono">
                              <span className="font-black text-amber-400 text-sm">{b.runs}</span>
                              <span className="text-muted-foreground ml-1">({b.balls}b, {b.fours}x4, {b.sixes}x6)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Current Bowler */}
                <div className="space-y-2 pt-3 border-t">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    🎯 Current Bowler
                  </span>
                  {(() => {
                    const activeBowlers = current.bowling.filter(
                      (b) => b.balls > 0 || b.wides > 0 || b.noBalls > 0 || b.runs > 0 || b.wickets > 0,
                    );
                    const currentBowlerId = (current as unknown as { currentBowlerId?: string | null })?.currentBowlerId;
                    let currentBowler = currentBowlerId
                      ? current.bowling.find((b) => b.playerId === currentBowlerId) ?? null
                      : null;
                    if (!currentBowler && activeBowlers.length > 0) {
                      currentBowler = activeBowlers[activeBowlers.length - 1];
                    }

                    if (!currentBowler) {
                      return <p className="text-xs text-muted-foreground">Waiting for bowler selection…</p>;
                    }

                    const econ =
                      currentBowler.balls > 0
                        ? ((currentBowler.runs / currentBowler.balls) * 6).toFixed(2)
                        : "0.00";

                    return (
                      <div className="p-2.5 rounded-xl border bg-sky-500/10 border-sky-500/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
                          <PlayerLink playerId={currentBowler.playerId} name={currentBowler.playerName ?? "—"} className="font-bold text-sky-300" />
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-black text-sky-400 text-sm">{currentBowler.wickets}/{currentBowler.runs}</span>
                          <span className="text-muted-foreground ml-1.5">({ballsToOversText(currentBowler.balls)} ov, Econ {econ})</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Current Stand */}
                {currentStand && (
                  <div className="pt-3 border-t space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Users className="h-3 w-3 text-amber-500" /> Partnership
                      </span>
                      <span className="font-mono font-bold text-amber-400">
                        {currentStand.totalRuns} runs ({currentStand.totalBalls} balls)
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30 text-xs flex justify-between text-muted-foreground">
                      <span>{currentStand.player1Name}: <strong>{currentStand.player1Runs}</strong></span>
                      <span>{currentStand.player2Name}: <strong>{currentStand.player2Runs}</strong></span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Toss & Match Meta Info Card */}
          <Card className="border shadow-md bg-card">
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-500" /> Match Info & Venue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {match.tossWinnerId && match.tossDecision && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-base">🪙</span>
                  <div>
                    <p className="font-bold text-foreground">
                      {teamOf(match.tossWinnerId)?.name ?? "Toss Winner"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Won the toss and opted to <strong className="text-amber-400 uppercase">{match.tossDecision}</strong> first.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-rose-500" /> Ground</span>
                  <a
                    href="https://maps.app.goo.gl/va7W9eD3MYWH2SyCA?g_st=ac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-foreground hover:text-emerald-400 underline decoration-dotted underline-offset-2 transition-colors flex items-center gap-1"
                    title="Open on Google Maps"
                  >
                    <span>{match.venue || "Askari XI Ground, Lahore"}</span>
                    <span className="text-[10px] text-emerald-400">↗</span>
                  </a>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" /> Timing</span>
                  <span className="font-semibold text-foreground">{match.time || "Night Match"}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-emerald-500" /> Format</span>
                  <span className="font-semibold text-foreground">{matchOvers} Overs per side • Tape Ball</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fall of Wickets (FOW) Preview */}
          {fallOfWickets.length > 0 && (
            <Card className="border shadow-md bg-card">
              <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <Flame className="h-3.5 w-3.5 text-rose-500" /> Fall of Wickets ({fallOfWickets.length}/6)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                {fallOfWickets.map((w, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <span className="font-semibold text-foreground">{idx + 1}. {w.name} ({w.runs}r)</span>
                    <span className="text-[11px] text-rose-300 font-mono">{w.dismissal || "out"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <StoryCardModal
        open={storyModalOpen}
        onOpenChange={setStoryModalOpen}
        match={match}
        innings={innings}
        teams={teams}
        players={allPlayers ?? []}
      />

      <BroadcastModal
        open={broadcastModalOpen}
        onOpenChange={setBroadcastModalOpen}
        matchId={id!}
        matchTitle={`${teamA?.name ?? "Team A"} vs ${teamB?.name ?? "Team B"}`}
      />
    </div>
  );
}
