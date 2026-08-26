import { useQuery } from "@tanstack/react-query";
import { getStatistics } from "@/lib/queries";
import { ballsToOversText } from "@/lib/cricket";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeamBadge } from "@/components/TeamBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";
import { Trophy, Zap, Target, Award, Flame, Shield, Users, Rocket } from "lucide-react";

import { useTournament } from "@/context/TournamentContext";

export default function Statistics() {
  const { tournamentId } = useTournament();
  const { data, isLoading } = useQuery({
    queryKey: ["statistics", tournamentId],
    queryFn: () => getStatistics(tournamentId),
    refetchInterval: 20000,
  });

  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  const battingList = data?.batting ?? [];
  const bowlingList = data?.bowling ?? [];
  const teams = data?.teams ?? [];
  const summary = data?.summary;

  // Filtered lists based on team selection
  const filteredBatting = useMemo(() => {
    if (selectedTeamId === "all") return battingList;
    return battingList.filter((p) => p.teamId === selectedTeamId);
  }, [battingList, selectedTeamId]);

  const filteredBowling = useMemo(() => {
    if (selectedTeamId === "all") return bowlingList;
    return bowlingList.filter((p) => p.teamId === selectedTeamId);
  }, [bowlingList, selectedTeamId]);

  // Selected team object
  const activeTeam = teams.find((t) => t.id === selectedTeamId);

  // Top performers for current filter
  const bestBatsman = filteredBatting[0] ?? null;
  const bestBowler = filteredBowling[0] ?? null;

  // Total Tournament Boundaries (Sixes & Fours)
  const totalSixes = useMemo(() => {
    return battingList.reduce((acc, p) => acc + (p.sixes || 0), 0);
  }, [battingList]);

  const totalFours = useMemo(() => {
    return battingList.reduce((acc, p) => acc + (p.fours || 0), 0);
  }, [battingList]);

  // Sixes Leader (Most Sixes in tournament or filtered team)
  const mostSixesPlayer = useMemo(() => {
    if (filteredBatting.length === 0) return null;
    return [...filteredBatting].sort(
      (a, b) => b.sixes - a.sixes || b.runs - a.runs,
    )[0];
  }, [filteredBatting]);

  // Most boundaries (4s + 6s)
  const mostBoundaries = useMemo(() => {
    if (filteredBatting.length === 0) return null;
    return [...filteredBatting].sort(
      (a, b) => b.fours + b.sixes - (a.fours + a.sixes) || b.runs - a.runs,
    )[0];
  }, [filteredBatting]);

  // Best economy (min 1 over = 6 balls)
  const bestEconomy = useMemo(() => {
    const qualified = filteredBowling.filter((b) => b.balls >= 6);
    if (qualified.length === 0) return null;
    return [...qualified].sort((a, b) => a.economy - b.economy)[0];
  }, [filteredBowling]);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
            Tournament Statistics & Player Performance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Individual batting and bowling records for the WASA Premier League.
          </p>
        </div>

        {/* Team Filter Dropdown */}
        <div className="flex items-center gap-2">
          <LabelText text="Filter by Team:" />
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-56 font-semibold">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🌐 All Teams (Tournament)</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.shortName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary KPI Cards with Total Sixes */}
      {summary && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Stat
            label="Total Runs"
            value={summary.totalRuns}
            icon={Target}
            color="text-amber-500"
          />
          <Stat
            label="Total Sixes"
            value={totalSixes}
            icon={Rocket}
            color="text-rose-500"
          />
          <Stat
            label="Total Fours"
            value={totalFours}
            icon={Zap}
            color="text-indigo-400"
          />
          <Stat
            label="Total Wickets"
            value={summary.totalWickets}
            icon={Trophy}
            color="text-sky-500"
          />
          <Stat
            label="Highest Score"
            value={
              summary.highestTeamScore
                ? `${summary.highestTeamScore.runs}/${summary.highestTeamScore.wickets}`
                : "—"
            }
            icon={Flame}
            color="text-emerald-500"
          />
          <Stat
            label="Completed Matches"
            value={`${summary.completedMatches} / ${summary.totalMatches}`}
            icon={Award}
            color="text-teal-400"
          />
        </div>
      )}

      {/* Highlight Cards: Best Batsman & Best Bowler */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Top Batsman */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              {activeTeam ? `${activeTeam.name} Top Batsman` : "Top Run Scorer 🟠"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestBatsman ? (
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <PlayerAvatar
                    name={bestBatsman.name}
                    photoUrl={bestBatsman.photoUrl}
                    size="sm"
                    className="ring-1 ring-amber-400/50"
                  />
                  <div className="min-w-0">
                    <p className="text-base font-bold truncate">
                      <PlayerLink playerId={bestBatsman.playerId} name={bestBatsman.name} />
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{bestBatsman.teamName}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-amber-500/20 pt-2">
                  <span className="text-2xl font-black text-amber-500 font-mono">
                    {bestBatsman.runs} <span className="text-xs font-normal text-muted-foreground">runs</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    Avg: {bestBatsman.average ? bestBatsman.average.toFixed(1) : "—"} · SR: {bestBatsman.strikeRate.toFixed(1)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">No batting records yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Top Bowler */}
        <Card className="border-sky-500/20 bg-sky-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="h-4 w-4" />
              {activeTeam ? `${activeTeam.name} Top Bowler` : "Top Wicket Taker 🟣"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestBowler ? (
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <PlayerAvatar
                    name={bestBowler.name}
                    photoUrl={bestBowler.photoUrl}
                    size="sm"
                    className="ring-1 ring-sky-400/50"
                  />
                  <div className="min-w-0">
                    <p className="text-base font-bold truncate">
                      <PlayerLink playerId={bestBowler.playerId} name={bestBowler.name} />
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{bestBowler.teamName}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-sky-500/20 pt-2">
                  <span className="text-2xl font-black text-sky-500 font-mono">
                    {bestBowler.wickets} <span className="text-xs font-normal text-muted-foreground">wkts</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    Best: {bestBowler.bestFigures} · Econ: {bestBowler.economy.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">No bowling records yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Sixes King */}
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
              <Rocket className="h-4 w-4" /> Sixes King 🚀
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mostSixesPlayer && mostSixesPlayer.sixes > 0 ? (
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <PlayerAvatar
                    name={mostSixesPlayer.name}
                    photoUrl={mostSixesPlayer.photoUrl}
                    size="sm"
                    className="ring-1 ring-rose-400/50"
                  />
                  <div className="min-w-0">
                    <p className="text-base font-bold truncate">
                      <PlayerLink playerId={mostSixesPlayer.playerId} name={mostSixesPlayer.name} />
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{mostSixesPlayer.teamName}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-rose-500/20 pt-2">
                  <span className="text-2xl font-black text-rose-500 font-mono">
                    {mostSixesPlayer.sixes} <span className="text-xs font-normal text-muted-foreground">sixes</span>
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {mostSixesPlayer.runs} runs · SR {mostSixesPlayer.strikeRate.toFixed(1)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">No sixes recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Best Economy */}
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="h-4 w-4" /> Best Economy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestEconomy ? (
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <PlayerAvatar
                    name={bestEconomy.name}
                    photoUrl={bestEconomy.photoUrl}
                    size="sm"
                    className="ring-1 ring-indigo-400/50"
                  />
                  <div className="min-w-0">
                    <p className="text-base font-bold truncate">
                      <PlayerLink playerId={bestEconomy.playerId} name={bestEconomy.name} />
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{bestEconomy.teamName}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between border-t border-indigo-500/20 pt-2">
                  <span className="text-2xl font-black text-indigo-400 font-mono">
                    {bestEconomy.economy.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {ballsToOversText(bestEconomy.balls)} ov · {bestEconomy.wickets} wkts
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4">No economy data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Breakdown Carousel/Cards if "All Teams" is active */}
      {selectedTeamId === "all" && teams.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" /> Team-Wise Top Performers Overview
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => {
              const teamBat = battingList.filter((p) => p.teamId === t.id);
              const teamBowl = bowlingList.filter((p) => p.teamId === t.id);
              const topB = teamBat[0];
              const topW = teamBowl[0];

              return (
                <Card
                  key={t.id}
                  className="hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => setSelectedTeamId(t.id)}
                >
                  <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0 border-b">
                    <div className="flex items-center gap-2.5">
                      <TeamBadge shortName={t.shortName} logoUrl={t.logoUrl} size="sm" />
                      <div>
                        <CardTitle className="text-sm font-bold">{t.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px] py-0">
                          Group {t.groupName}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2">
                      View Roster →
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" /> Best Batter:
                      </span>
                      <span className="font-bold text-foreground">
                        {topB ? (
                          <>
                            <PlayerLink playerId={topB.playerId} name={topB.name} /> ({topB.runs}r)
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-sky-500" /> Best Bowler:
                      </span>
                      <span className="font-bold text-foreground">
                        {topW ? (
                          <>
                            <PlayerLink playerId={topW.playerId} name={topW.name} /> ({topW.wickets}w)
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Stats Tables (Batting & Bowling) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {activeTeam ? (
              <>
                <TeamBadge shortName={activeTeam.shortName} logoUrl={activeTeam.logoUrl} size="sm" />
                <span>{activeTeam.name} Player Performance</span>
              </>
            ) : (
              <span>Overall Tournament Player Standings</span>
            )}
          </h2>

          {selectedTeamId !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTeamId("all")}
              className="text-xs"
            >
              Show All Teams
            </Button>
          )}
        </div>

        <Tabs defaultValue="batting" className="w-full">
          <TabsList className="grid w-64 grid-cols-2">
            <TabsTrigger value="batting" className="gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" /> Batting
            </TabsTrigger>
            <TabsTrigger value="bowling" className="gap-1.5">
              <Trophy className="h-4 w-4 text-sky-500" /> Bowling
            </TabsTrigger>
          </TabsList>

          {/* Batting Performance Table */}
          <TabsContent value="batting" className="mt-4">
            {filteredBatting.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground text-sm">
                No batting statistics recorded yet for this selection.
              </div>
            ) : (
              <div className="rounded-xl border overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-center">Rank</TableHead>
                      <TableHead>Batter</TableHead>
                      {selectedTeamId === "all" && <TableHead>Team</TableHead>}
                      <TableHead className="text-right">Inns</TableHead>
                      <TableHead className="text-right font-bold text-amber-500">Runs</TableHead>
                      <TableHead className="text-right">Balls</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">SR</TableHead>
                      <TableHead className="text-right">HS</TableHead>
                      <TableHead className="text-right">4s</TableHead>
                      <TableHead className="text-right">6s</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatting.map((p, i) => (
                      <TableRow key={p.playerId} className="hover:bg-muted/40">
                        <TableCell className="text-center font-bold font-mono">
                          {i === 0 ? (
                            <span title="Orange Cap / Leader">🥇</span>
                          ) : i === 1 ? (
                            "🥈"
                          ) : i === 2 ? (
                            "🥉"
                          ) : (
                            i + 1
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
                            <PlayerLink playerId={p.playerId} name={p.name} />
                          </div>
                        </TableCell>
                        {selectedTeamId === "all" && (
                          <TableCell className="text-muted-foreground text-sm">
                            {p.teamName}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-mono">{p.inningsCount}</TableCell>
                        <TableCell className="text-right font-black text-amber-500 font-mono text-base">
                          {p.runs}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {p.balls}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {p.average === null ? "—" : p.average.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {p.strikeRate.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{p.highest}</TableCell>
                        <TableCell className="text-right font-mono">{p.fours}</TableCell>
                        <TableCell className="text-right font-mono">{p.sixes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Bowling Performance Table */}
          <TabsContent value="bowling" className="mt-4">
            {filteredBowling.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground text-sm">
                No bowling statistics recorded yet for this selection.
              </div>
            ) : (
              <div className="rounded-xl border overflow-x-auto shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-center">Rank</TableHead>
                      <TableHead>Bowler</TableHead>
                      {selectedTeamId === "all" && <TableHead>Team</TableHead>}
                      <TableHead className="text-right">Inns</TableHead>
                      <TableHead className="text-right font-bold text-sky-500">Wkts</TableHead>
                      <TableHead className="text-right">Overs</TableHead>
                      <TableHead className="text-right">Maidens</TableHead>
                      <TableHead className="text-right">Runs</TableHead>
                      <TableHead className="text-right">Econ</TableHead>
                      <TableHead className="text-right">Avg</TableHead>
                      <TableHead className="text-right">Best</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBowling.map((p, i) => (
                      <TableRow key={p.playerId} className="hover:bg-muted/40">
                        <TableCell className="text-center font-bold font-mono">
                          {i === 0 ? (
                            <span title="Purple Cap / Leader">🥇</span>
                          ) : i === 1 ? (
                            "🥈"
                          ) : i === 2 ? (
                            "🥉"
                          ) : (
                            i + 1
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size="xs" />
                            <PlayerLink playerId={p.playerId} name={p.name} />
                          </div>
                        </TableCell>
                        {selectedTeamId === "all" && (
                          <TableCell className="text-muted-foreground text-sm">
                            {p.teamName}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-mono">{p.inningsCount}</TableCell>
                        <TableCell className="text-right font-black text-sky-500 font-mono text-base">
                          {p.wickets}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {ballsToOversText(p.balls)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{p.maidens}</TableCell>
                        <TableCell className="text-right font-mono">{p.runs}</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {p.economy.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {p.average === null ? "—" : p.average.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {p.bestFigures}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className={`text-2xl sm:text-3xl font-extrabold ${color} font-mono mt-1`}>
            {value}
          </p>
        </div>
        <div className={`p-2.5 rounded-xl bg-muted/60 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function LabelText({ text }: { text: string }) {
  return <span className="text-xs font-semibold text-muted-foreground">{text}</span>;
}
