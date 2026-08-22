import { useQuery } from "@tanstack/react-query";
import { getMatchById } from "@/lib/queries";
import { useParams, Link } from "react-router";
import { TeamBadge } from "@/components/TeamBadge";
import { ScorecardView, type InningsData } from "@/components/ScorecardView";
import { ManhattanGraph } from "@/components/ManhattanGraph";
import { RecentBalls } from "@/components/RecentBalls";
import { EventAnimationOverlay } from "@/components/EventAnimationOverlay";
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
} from "lucide-react";
import type { Player } from "@/lib/firestore";

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["match", id],
    queryFn: () => getMatchById(id!),
    enabled: !!id,
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Match Header Hero Card */}
      {/* Live Event Celebratory Overlay */}
      <EventAnimationOverlay event={match.recentEvent} />

      {/* Hero Match Card */}
      <Card className="border shadow-lg bg-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Badge
              variant="outline"
              className={statusBadgeClass(match.status as MatchStatus)}
            >
              {match.status.replace("_", " ")}
            </Badge>
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              {match.stage === "FINAL" ? "🏆 Final" : `Match ${match.matchNumber}`} ·{" "}
              {formatMatchDateTime(match.day, match.date, match.time)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            {/* Team A */}
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <TeamBadge
                shortName={match.teamA?.shortName ?? "TBD"}
                logoUrl={match.teamA?.logoUrl}
                size="lg"
              />
              <span className="font-extrabold text-base sm:text-lg">
                {match.teamA?.name ?? "Rank 1"}
              </span>
              {innings.find((i) => i.battingTeamId === match.teamA?.id) ? (
                <span className="font-mono text-xl sm:text-2xl font-black text-foreground">
                  {innings.find((i) => i.battingTeamId === match.teamA?.id)!.runs}/
                  {Math.min(5, innings.find((i) => i.battingTeamId === match.teamA?.id)!.wickets)}
                  <span className="text-xs text-muted-foreground ml-1.5 font-normal">
                    (
                    {ballsToOversText(
                      innings.find((i) => i.battingTeamId === match.teamA?.id)!.balls,
                    )}
                    ov)
                  </span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Yet to bat</span>
              )}
            </div>

            <div className="text-muted-foreground font-black text-sm px-2">VS</div>

            {/* Team B */}
            <div className="flex flex-col items-center gap-2 flex-1 text-center">
              <TeamBadge
                shortName={match.teamB?.shortName ?? "TBD"}
                logoUrl={match.teamB?.logoUrl}
                size="lg"
              />
              <span className="font-extrabold text-base sm:text-lg">
                {match.teamB?.name ?? "Rank 2"}
              </span>
              {innings.find((i) => i.battingTeamId === match.teamB?.id) ? (
                <span className="font-mono text-xl sm:text-2xl font-black text-foreground">
                  {innings.find((i) => i.battingTeamId === match.teamB?.id)!.runs}/
                  {Math.min(5, innings.find((i) => i.battingTeamId === match.teamB?.id)!.wickets)}
                  <span className="text-xs text-muted-foreground ml-1.5 font-normal">
                    (
                    {ballsToOversText(
                      innings.find((i) => i.battingTeamId === match.teamB?.id)!.balls,
                    )}
                    ov)
                  </span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Yet to bat</span>
              )}
            </div>
          </div>

          {/* Grand Match Result Banner for Completed Matches */}
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

          {/* Recent Deliveries with Over-by-Over Separation */}
          {currentInnings?.recentBalls && currentInnings.recentBalls.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2">
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

          {/* Toss & Venue Details */}
          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground border-t pt-3">
            {match.tossWinner && (
              <span className="font-medium text-foreground">
                🪙 Toss: {match.tossWinner.name} won and elected to{" "}
                {match.tossDecision === "BAT" ? "bat" : "bowl"}
              </span>
            )}
            {match.date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {match.date}
                {match.time ? ` · ${match.time}` : ""}
              </span>
            )}
            {match.venue && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {match.venue}
              </span>
            )}
          </div>

          {playerOfMatch && (
            <div className="mt-3 flex justify-center">
              <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 gap-1.5 py-1 px-3">
                <Award className="h-4 w-4" /> Player of the Match: {playerOfMatch.name}
              </Badge>
            </div>
          )}

          {match.status === "LIVE" && (
            <div className="mt-4 text-center">
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

      {/* Main Tabs: Scorecards vs Manhattan Graph vs Playing VI vs Match Info */}
      <Tabs defaultValue="scorecard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-0">
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
          <TabsTrigger value="info" className="text-xs sm:text-sm font-bold gap-1.5">
            <MapPin className="h-4 w-4 text-sky-500" /> Match Info
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

        {/* Tab: Manhattan Graph */}
        <TabsContent value="manhattan" className="mt-4 space-y-6">
          <ManhattanGraph
            inn1={inn1}
            inn2={inn2}
            teamA={teamA}
            teamB={teamB}
            maxOvers={match.stage === "FINAL" ? 5 : 4}
          />
        </TabsContent>

        {/* Tab 2: Team Squads (Pre-match) OR Match Playing VI (Post-toss/Live) */}
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
                        {lineupA.fullSquad.map((p, idx) => (
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
                    )}
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
                        {lineupB.fullSquad.map((p, idx) => (
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
                    )}
                    <p className="text-[11px] text-muted-foreground pt-1 italic">
                      * Starting Playing VI (6) and Reserve (1) are decided at match toss.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Match Information & Event Details */}
        <TabsContent value="info" className="mt-4">
          <Card className="border shadow-sm">
            <CardHeader className="p-4 sm:p-5 border-b">
              <CardTitle className="text-base font-bold">Match Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-4 border-b pb-3">
                <span className="text-muted-foreground">Tournament:</span>
                <span className="font-semibold text-foreground">
                  WASA Premier League (WPL) — Officers Event
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b pb-3">
                <span className="text-muted-foreground">Match Format & Rules:</span>
                <span className="font-semibold text-foreground">
                  {match.stage === "FINAL"
                    ? "6-a-side Indoor Cricket (5 Overs Per Side · 1 Bowler max 2 Overs, others max 1 Over)"
                    : "6-a-side Indoor Cricket (4 Overs Per Side · Maximum 1 Over per Bowler)"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b pb-3">
                <span className="text-muted-foreground">Stage & Number:</span>
                <span className="font-semibold text-foreground">
                  {match.stage === "FINAL" ? "🏆 Final" : `League Stage — Match #${match.matchNumber}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b pb-3">
                <span className="text-muted-foreground">Date & Timing:</span>
                <span className="font-semibold text-foreground">
                  {match.date || match.time
                    ? `${match.date ?? ""} ${match.time ? `· ${match.time}` : ""}`
                    : "Schedule to be announced"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b pb-3">
                <span className="text-muted-foreground">Venue / Ground:</span>
                <span className="font-semibold text-foreground">
                  {match.venue ?? "Askari XI, Lahore"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-muted-foreground">Toss Result:</span>
                <span className="font-semibold text-foreground">
                  {match.tossWinner
                    ? `${match.tossWinner.name} won the toss and elected to ${match.tossDecision?.toLowerCase()}`
                    : "Toss not conducted yet"}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
