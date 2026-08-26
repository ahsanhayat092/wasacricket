import { useQuery } from "@tanstack/react-query";
import { getMatchById } from "@/lib/queries";
import { useParams, Link } from "react-router";
import { TeamBadge } from "@/components/TeamBadge";
import { ScorecardView, type InningsData } from "@/components/ScorecardView";
import { ManhattanGraph } from "@/components/ManhattanGraph";
import { RecentBalls } from "@/components/RecentBalls";
import { EventAnimationOverlay, type EventData } from "@/components/EventAnimationOverlay";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  statusBadgeClass,
  ballsToOversText,
  formatMatchDay,
  formatMatchDateTime,
  type MatchStatus,
} from "@/lib/cricket";
import { StoryCardModal } from "@/components/StoryCardModal";
import { BroadcastModal } from "@/components/BroadcastModal";
import { Button } from "@/components/ui/button";
import { triggerChampionConfetti } from "@/lib/confetti";
import {
  Award,
  CalendarDays,
  MapPin,
  Users,
  Trophy,
  Crown,
  Shield,
  Zap,
  ArrowRightLeft,
  BarChart3,
  Camera,
  Clock,
  Flame,
  Activity,
  PartyPopper,
  Tv,
} from "lucide-react";
import type { Player } from "@/lib/firestore";
import { useState, useEffect } from "react";

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [manualEvent, setManualEvent] = useState<EventData | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["match", id],
    queryFn: () => getMatchById(id!),
    enabled: !!id,
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const { match, innings, players, playerOfMatch } = data;
  const teamA = match.teamA;
  const teamB = match.teamB;

  const inn1 = innings.find((i) => i.inningsNumber === 1);
  const inn2 = innings.find((i) => i.inningsNumber === 2);
  const currentInnings = inn2 ?? inn1 ?? null;

  const teamName = (teamId: string) =>
    teamA?.id === teamId ? teamA.name : teamB?.id === teamId ? teamB.name : "Team";

  const playerName = (id: string) =>
    (players ?? []).find((p) => p.id === id)?.name ?? "Player";

  const inningsView: InningsData[] = innings.map((inn) => ({
    ...inn,
    battingTeamName: `${teamName(inn.battingTeamId)} Innings`,
    batting: inn.batting.map((b) => ({
      ...b,
      playerName: (b as { playerName?: string }).playerName || playerName(b.playerId),
    })),
    bowling: inn.bowling
      .filter((b) => b.balls > 0 || b.wides > 0 || b.noBalls > 0 || b.runs > 0 || b.wickets > 0)
      .map((b) => ({
        ...b,
        playerName: (b as { playerName?: string }).playerName || playerName(b.playerId),
      })),
  }));

  // Squad filtering for Team A & Team B
  const teamAPlayers = (players ?? []).filter((p) => p.teamId === match.teamAId);
  const teamBPlayers = (players ?? []).filter((p) => p.teamId === match.teamBId);

  // Playing VI lineup (6 playing + 1 reserve)
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

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6 space-y-6">
      <EventAnimationOverlay
        event={manualEvent ?? match.recentEvent}
        onDismiss={() => setManualEvent(null)}
      />
      <StoryCardModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        match={match}
        players={players ?? []}
        innings={innings}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <Card className="border shadow-xl bg-card overflow-hidden">
            <CardContent className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={statusBadgeClass(match.status as MatchStatus)}
                  >
                    {match.status.replace("_", " ")}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStoryModalOpen(true)}
                    className="h-7 text-xs font-bold gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 rounded-lg px-2.5"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Share Story</span>
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
                </div>
                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                  <span className={match.stage === "FINAL" ? "text-amber-500 font-extrabold" : match.stage === "PLAYOFF" ? "text-purple-400 font-extrabold" : "text-amber-500 font-extrabold"}>
                    {match.stage === "FINAL" ? "🏆 Grand Final" : match.stage === "PLAYOFF" ? "⚔️ Playoff Match" : `Match #${match.matchNumber}`}
                  </span>
                  <span>•</span>
                  <span>{formatMatchDateTime(match.day, match.date, match.time)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex flex-col items-center gap-2 flex-1 text-center">
                  <TeamBadge
                    shortName={match.teamA?.shortName ?? "TBD"}
                    logoUrl={match.teamA?.logoUrl}
                    size="lg"
                  />
                  <span className="font-black text-base sm:text-xl tracking-tight">
                    {match.teamA?.name ?? (isFinal ? "TBD (Rank 1)" : isPlayoff ? "TBD (Rank 2)" : "TBD")}
                  </span>
                  {innings.find((i) => i.battingTeamId === match.teamA?.id) ? (
                    <div className="font-mono">
                      <span className="text-2xl sm:text-3xl font-black text-foreground">
                        {innings.find((i) => i.battingTeamId === match.teamA?.id)!.runs}/
                        {Math.min(6, innings.find((i) => i.battingTeamId === match.teamA?.id)!.wickets)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1.5 font-normal">
                        ({ballsToOversText(innings.find((i) => i.battingTeamId === match.teamA?.id)!.balls)} ov)
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Yet to bat</span>
                  )}
                </div>

                <div className="text-muted-foreground/60 font-black text-base sm:text-lg px-2">VS</div>

                <div className="flex flex-col items-center gap-2 flex-1 text-center">
                  <TeamBadge
                    shortName={match.teamB?.shortName ?? "TBD"}
                    logoUrl={match.teamB?.logoUrl}
                    size="lg"
                  />
                  <span className="font-black text-base sm:text-xl tracking-tight">
                    {match.teamB?.name ?? (isFinal ? "TBD (Playoff Winner)" : isPlayoff ? "TBD (Rank 3)" : "TBD")}
                  </span>
                  {innings.find((i) => i.battingTeamId === match.teamB?.id) ? (
                    <div className="font-mono">
                      <span className="text-2xl sm:text-3xl font-black text-foreground">
                        {innings.find((i) => i.battingTeamId === match.teamB?.id)!.runs}/
                        {Math.min(6, innings.find((i) => i.battingTeamId === match.teamB?.id)!.wickets)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1.5 font-normal">
                        ({ballsToOversText(innings.find((i) => i.battingTeamId === match.teamB?.id)!.balls)} ov)
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Yet to bat</span>
                  )}
                </div>
              </div>

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
                        <span>TOURNAMENT CHAMPIONS</span>
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

              {currentInnings?.recentBalls && currentInnings.recentBalls.length > 0 && (
                <div className="mt-5 pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-500" /> Recent Deliveries (Over by Over)
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      Innings {currentInnings.inningsNumber}
                    </span>
                  </div>
                  <RecentBalls balls={currentInnings.recentBalls} maxOversToShow={match.stage === "FINAL" ? 5 : 4} />
                </div>
              )}

              {match.status === "LIVE" && (
                <div className="mt-4 text-center pt-3 border-t">
                  <Link
                    to={`/live/${match.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-red-500 hover:underline"
                  >
                    <Zap className="h-4 w-4 animate-pulse" /> Watch Real-Time Live Match Centre →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Tabs: Scorecards vs Manhattan Graph vs Playing VI */}
          <Tabs defaultValue="scorecard" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-11">
              <TabsTrigger value="scorecard" className="text-xs sm:text-sm font-bold gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" /> Scorecard
              </TabsTrigger>
              <TabsTrigger value="manhattan" className="text-xs sm:text-sm font-bold gap-1.5">
                <BarChart3 className="h-4 w-4 text-indigo-400" /> Manhattan
              </TabsTrigger>
              <TabsTrigger value="lineup" className="text-xs sm:text-sm font-bold gap-1.5">
                <Users className="h-4 w-4 text-emerald-500" />
                {lineupA.hasConfirmed || lineupB.hasConfirmed ? "Playing VI" : "Squads"}
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Detailed Scorecards */}
            <TabsContent value="scorecard" className="mt-4 space-y-6">
              {inningsView.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground text-sm">
                  Scorecard is not available yet. It will appear once the match starts.
                </Card>
              ) : (
                inningsView.map((inn) => (
                  <ScorecardView
                    key={inn.id}
                    innings={inn}
                    squadPlayers={players}
                  />
                ))
              )}
            </TabsContent>

            {/* Tab 2: Manhattan Graph */}
            <TabsContent value="manhattan" className="mt-4 space-y-6">
              <ManhattanGraph
                inn1={inn1}
                inn2={inn2}
                teamA={teamA}
                teamB={teamB}
                maxOvers={match.stage === "FINAL" ? 5 : 4}
              />
            </TabsContent>

            {/* Tab 3: Team Squads OR Playing VI */}
            <TabsContent value="lineup" className="mt-4 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Team A */}
                <Card className="border shadow-sm">
                  <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamBadge
                          shortName={teamA?.shortName ?? "TBD"}
                          logoUrl={teamA?.logoUrl}
                          size="sm"
                        />
                        <CardTitle className="text-sm font-bold">
                          {teamA?.name ?? "Team A"} {lineupA.hasConfirmed ? "Lineup" : "Squad"}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {lineupA.hasConfirmed ? "6 Playing + 1 Reserve" : `${lineupA.fullSquad.length} Squad Players`}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {lineupA.hasConfirmed ? (
                      <>
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-emerald-500" /> Starting Playing VI (6)
                          </span>
                          <div className="space-y-1.5">
                            {lineupA.playingList.map((p, idx) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-muted-foreground w-3 text-center text-[10px]">
                                    {idx + 1}
                                  </span>
                                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
                                  <PlayerLink playerId={p.id} name={p.name} className="font-semibold" />
                                  {(p.isCaptain || p.designation === "Captain") && (
                                    <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">
                                      (C)
                                    </Badge>
                                  )}
                                  {(p.isViceCaptain || p.designation === "Vice Captain") && (
                                    <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold">
                                      (VC)
                                    </Badge>
                                  )}
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                  {p.role}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {lineupA.reservePlayer && (
                          <div className="pt-2 border-t space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Match Reserve Player (1)
                            </span>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                              <div className="flex items-center gap-2">
                                <PlayerAvatar name={lineupA.reservePlayer.name} photoUrl={lineupA.reservePlayer.photoUrl} size="xs" />
                                <PlayerLink playerId={lineupA.reservePlayer.id} name={lineupA.reservePlayer.name} className="font-semibold" />
                                <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500">
                                  Reserve
                                </Badge>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                {lineupA.reservePlayer.role}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-sky-500" /> Full Team Squad ({lineupA.fullSquad.length})
                        </span>
                        {lineupA.fullSquad.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2 italic">Squad not announced yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {lineupA.fullSquad.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
                                  <PlayerLink playerId={p.id} name={p.name} className="font-semibold" />
                                  {(p.isCaptain || p.designation === "Captain") && (
                                    <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">
                                      (C)
                                    </Badge>
                                  )}
                                  {(p.isViceCaptain || p.designation === "Vice Captain") && (
                                    <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold">
                                      (VC)
                                    </Badge>
                                  )}
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                  {p.role}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Team B */}
                <Card className="border shadow-sm">
                  <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamBadge
                          shortName={teamB?.shortName ?? "TBD"}
                          logoUrl={teamB?.logoUrl}
                          size="sm"
                        />
                        <CardTitle className="text-sm font-bold">
                          {teamB?.name ?? "Team B"} {lineupB.hasConfirmed ? "Lineup" : "Squad"}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {lineupB.hasConfirmed ? "6 Playing + 1 Reserve" : `${lineupB.fullSquad.length} Squad Players`}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {lineupB.hasConfirmed ? (
                      <>
                        <div className="space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-emerald-500" /> Starting Playing VI (6)
                          </span>
                          <div className="space-y-1.5">
                            {lineupB.playingList.map((p, idx) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-muted-foreground w-3 text-center text-[10px]">
                                    {idx + 1}
                                  </span>
                                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
                                  <PlayerLink playerId={p.id} name={p.name} className="font-semibold" />
                                  {(p.isCaptain || p.designation === "Captain") && (
                                    <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">
                                      (C)
                                    </Badge>
                                  )}
                                  {(p.isViceCaptain || p.designation === "Vice Captain") && (
                                    <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold">
                                      (VC)
                                    </Badge>
                                  )}
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                  {p.role}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {lineupB.reservePlayer && (
                          <div className="pt-2 border-t space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Match Reserve Player (1)
                            </span>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                              <div className="flex items-center gap-2">
                                <PlayerAvatar name={lineupB.reservePlayer.name} photoUrl={lineupB.reservePlayer.photoUrl} size="xs" />
                                <PlayerLink playerId={lineupB.reservePlayer.id} name={lineupB.reservePlayer.name} className="font-semibold" />
                                <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500">
                                  Reserve
                                </Badge>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                {lineupB.reservePlayer.role}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-sky-500" /> Full Team Squad ({lineupB.fullSquad.length})
                        </span>
                        {lineupB.fullSquad.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2 italic">Squad not announced yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {lineupB.fullSquad.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
                                  <PlayerLink playerId={p.id} name={p.name} className="font-semibold" />
                                  {(p.isCaptain || p.designation === "Captain") && (
                                    <Badge className="bg-amber-600 text-white text-[9px] py-0 px-1 font-bold">
                                      (C)
                                    </Badge>
                                  )}
                                  {(p.isViceCaptain || p.designation === "Vice Captain") && (
                                    <Badge className="bg-sky-600 text-white text-[9px] py-0 px-1 font-bold">
                                      (VC)
                                    </Badge>
                                  )}
                                </div>
                                <Badge variant="secondary" className="text-[10px]">
                                  {p.role}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column (4 Cols): Match Hub Side Panel */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* Match Venue & Meta Info Card */}
          <Card className="border shadow-md bg-card">
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-amber-500" /> Match Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {match.tossWinner && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-base">🪙</span>
                  <div>
                    <p className="font-bold text-foreground">
                      {match.tossWinner.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Won the toss and elected to <strong className="text-amber-400 uppercase">{match.tossDecision?.toLowerCase()}</strong> first.
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
                    <span>{match.venue || "Askari XI Cricket Ground, Lahore"}</span>
                    <span className="text-[10px] text-emerald-400">↗</span>
                  </a>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-emerald-500" /> Date</span>
                  <span className="font-semibold text-foreground">{match.date || formatMatchDay(match.day, match.date)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" /> Time</span>
                  <span className="font-semibold text-foreground">{match.time || "Night Match"}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-indigo-400" /> Format</span>
                  <span className="font-semibold text-foreground">{match.stage === "FINAL" ? 5 : 4} Overs per side • Tape Ball</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Standings / Matchup Summary Card */}
          <Card className="border shadow-md bg-card">
            <CardHeader className="p-4 pb-2 border-b bg-muted/20">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-emerald-500" /> Tournament Stage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="font-extrabold text-emerald-400 text-sm">
                  {match.stage === "FINAL"
                    ? "GRAND FINAL FIXTURE 🏆"
                    : match.stage === "PLAYOFF"
                      ? "PLAYOFF MATCH (Rank 2 vs 3) ⚔️"
                      : `LEAGUE MATCH #${match.matchNumber}`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  WASA Premier League 2026
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <StoryCardModal
        open={storyModalOpen}
        onOpenChange={setStoryModalOpen}
        match={match}
        teamA={teamA}
        teamB={teamB}
        inn1={inn1}
        inn2={inn2}
      />

      <BroadcastModal
        open={broadcastModalOpen}
        onOpenChange={setBroadcastModalOpen}
        matchId={id!}
        matchTitle={`${match.teamA?.name ?? "Team A"} vs ${match.teamB?.name ?? "Team B"}`}
      />
    </div>
  );
}
