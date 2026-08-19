import { useQuery } from "@tanstack/react-query";
import { getMatchById } from "@/lib/queries";
import { useParams, Link } from "react-router";
import { TeamBadge } from "@/components/TeamBadge";
import { ScorecardView, type InningsData } from "@/components/ScorecardView";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { statusBadgeClass, ballsToOversText, formatMatchDay, type MatchStatus } from "@/lib/cricket";
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
    bowling: inn.bowling.map((b) => ({
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
    let playingList: Player[] = [];
    let reservePlayer: Player | null = null;

    if (playingVIIds && playingVIIds.length > 0) {
      playingList = playingVIIds
        .map((pid) => teamSquad.find((p) => p.id === pid))
        .filter((p): p is Player => p !== undefined);
      reservePlayer = reserveId ? teamSquad.find((p) => p.id === reserveId) ?? null : null;
    } else {
      // Default: top 6 players as Playing VI, 7th as Reserve
      playingList = teamSquad.slice(0, 6);
      reservePlayer = teamSquad[6] ?? null;
    }

    return { playingList, reservePlayer };
  };

  const lineupA = getLineup(teamAPlayers, match.teamAPlayingVI, match.teamAReserveId);
  const lineupB = getLineup(teamBPlayers, match.teamBPlayingVI, match.teamBReserveId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Match Header Hero Card */}
      <Card className="border shadow-md overflow-hidden bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {match.stage === "FINAL" ? "🏆 Final" : `Match ${match.matchNumber}`} ·{" "}
              {formatMatchDay(match.day, match.date)} · WASA Premier League
            </span>
            <Badge
              variant="outline"
              className={statusBadgeClass(match.status as MatchStatus)}
            >
              {match.status.replace("_", " ")}
            </Badge>
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
                  {innings.find((i) => i.battingTeamId === match.teamA?.id)!.wickets}
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
                  {innings.find((i) => i.battingTeamId === match.teamB?.id)!.wickets}
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

          {/* Result Text */}
          {match.resultText && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-base sm:text-lg font-black text-emerald-500">
                {match.resultText}
              </p>
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

      {/* Main Tabs: Scorecards vs Playing VI vs Match Info */}
      <Tabs defaultValue="scorecard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scorecard" className="text-xs sm:text-sm font-bold gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" /> Scorecard
          </TabsTrigger>
          <TabsTrigger value="lineup" className="text-xs sm:text-sm font-bold gap-1.5">
            <Users className="h-4 w-4 text-emerald-500" /> Playing VI
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

        {/* Tab 2: Playing VI (6 Starting + 1 Reserve) */}
        <TabsContent value="lineup" className="mt-4 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Team A Lineup */}
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
                      {teamA?.name ?? "Team A"} Lineup
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    6 Playing + 1 Reserve
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-500" /> Starting Playing VI (6)
                  </span>
                  {lineupA.playingList.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Squad not finalized.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {lineupA.playingList.map((p, idx) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground w-4 text-center">
                              {idx + 1}
                            </span>
                            <span className="font-semibold">{p.name}</span>
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

                {/* Team A Reserve */}
                <div className="pt-2 border-t space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Reserve Player (1)
                  </span>
                  {lineupA.reservePlayer ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{lineupA.reservePlayer.name}</span>
                        <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500">
                          Reserve
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {lineupA.reservePlayer.role}
                      </Badge>
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
                    <TeamBadge
                      shortName={teamB?.shortName ?? "TBD"}
                      logoUrl={teamB?.logoUrl}
                      size="sm"
                    />
                    <CardTitle className="text-sm font-bold">
                      {teamB?.name ?? "Team B"} Lineup
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    6 Playing + 1 Reserve
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-500" /> Starting Playing VI (6)
                  </span>
                  {lineupB.playingList.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Squad not finalized.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {lineupB.playingList.map((p, idx) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-muted-foreground w-4 text-center">
                              {idx + 1}
                            </span>
                            <span className="font-semibold">{p.name}</span>
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

                {/* Team B Reserve */}
                <div className="pt-2 border-t space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" /> Reserve Player (1)
                  </span>
                  {lineupB.reservePlayer ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{lineupB.reservePlayer.name}</span>
                        <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500">
                          Reserve
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {lineupB.reservePlayer.role}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No reserve assigned.</p>
                  )}
                </div>
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
                  {match.date ?? "26-27 August"} · {match.time ?? "9:00 PM to 1:00 AM"}
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
