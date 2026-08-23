import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ballsToOversText,
  getInningsFallOfWickets,
  getInningsPartnerships,
} from "@/lib/cricket";
import type { Player, FallOfWicket, Partnership } from "@/lib/firestore";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerLink } from "@/components/PlayerLink";
import { Users, ShieldAlert, Zap, ArrowRightLeft } from "lucide-react";

type BattingRow = {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  isOnStrike?: boolean;
  dismissal?: string | null;
  battingOrder?: number;
};

type BowlingRow = {
  playerId: string;
  playerName: string;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  wides: number;
  noBalls: number;
};

export type InningsData = {
  id: string;
  inningsNumber: number;
  runs: number;
  wickets: number;
  balls: number;
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penaltyRuns: number;
  battingTeamName?: string;
  battingTeamId: string;
  bowlingTeamId: string;
  strikerId?: string | null;
  currentStrikerId?: string | null;
  fallOfWickets?: FallOfWicket[];
  partnerships?: Partnership[];
  batting: BattingRow[];
  bowling: BowlingRow[];
};

export function ScorecardView({
  innings,
  squadPlayers = [],
  showPartnerships = true,
}: {
  innings: InningsData;
  squadPlayers?: Player[];
  showPartnerships?: boolean;
}) {
  const extras =
    innings.wides + innings.noBalls + innings.byes + innings.legByes + innings.penaltyRuns;

  // Calculate Did Not Bat players from squad
  const battedPlayerIds = new Set(innings.batting.map((b) => b.playerId));
  const battingSquad = squadPlayers.filter((p) => p.teamId === innings.battingTeamId);
  const didNotBat = battingSquad.filter((p) => !battedPlayerIds.has(p.id));

  const getPlayerDisplayName = (playerId: string, fallback?: string) => {
    if (fallback && fallback !== "Unknown" && fallback !== "Player") return fallback;
    const found = squadPlayers.find((p) => p.id === playerId);
    return found?.name ?? fallback ?? "Player";
  };

  const fallOfWickets = getInningsFallOfWickets(innings, squadPlayers);
  const partnerships = getInningsPartnerships(innings, squadPlayers);

  // Compact FOW string (e.g. 1-14 (A. Khan, 1.2 ov), 2-35 (B. Ahmed, 3.4 ov))
  const fowString = fallOfWickets
    .map(
      (f) =>
        `${f.runs}/${f.wicketNumber} (${f.playerName ?? "Player"}, ${f.overs || ballsToOversText(f.balls)} ov)`,
    )
    .join(", ");

  return (
    <Card className="border shadow-sm">
      <CardHeader className="p-4 sm:p-5 border-b bg-muted/20">
        <CardTitle className="flex flex-wrap items-center justify-between text-base sm:text-lg gap-2">
          <span className="font-extrabold">
            {innings.battingTeamName ?? `Innings ${innings.inningsNumber}`}
          </span>
          <span className="font-mono font-bold text-foreground">
            {innings.runs}/{Math.min(6, innings.wickets)}
            <span className="text-xs sm:text-sm text-muted-foreground ml-2 font-semibold">
              ({ballsToOversText(innings.balls)} ov, RR:{" "}
              {innings.balls > 0 ? ((innings.runs / innings.balls) * 6).toFixed(2) : "0.00"})
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Batting Table */}
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 text-xs">
                <TableHead>Batter</TableHead>
                <TableHead>Dismissal</TableHead>
                <TableHead className="text-right font-bold text-amber-500">R</TableHead>
                <TableHead className="text-right">B</TableHead>
                <TableHead className="text-right">4s</TableHead>
                <TableHead className="text-right">6s</TableHead>
                <TableHead className="text-right">SR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {innings.batting.map((b) => {
                const isOnStrike =
                  !b.isOut &&
                  (b.isOnStrike ||
                    b.playerId === innings.strikerId ||
                    b.playerId === innings.currentStrikerId);
                const name = getPlayerDisplayName(b.playerId, b.playerName);

                return (
                  <TableRow key={b.playerId} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-sm">
                      {isOnStrike ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-amber-500 font-black text-base leading-none">*</span>
                          <PlayerLink playerId={b.playerId} name={name} />
                        </span>
                      ) : (
                        <PlayerLink playerId={b.playerId} name={name} />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-mono">
                      {b.isOut ? (
                        b.dismissal ?? "out"
                      ) : (
                        <span className="text-emerald-500 font-bold">not out</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-black text-amber-500 font-mono text-base">
                      {b.runs}
                    </TableCell>
                    <TableCell className="text-right font-mono">{b.balls}</TableCell>
                    <TableCell className="text-right font-mono">{b.fours}</TableCell>
                    <TableCell className="text-right font-mono">{b.sixes}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/30 text-xs">
                <TableCell colSpan={2} className="font-semibold">
                  Extras
                  <span className="text-[11px] text-muted-foreground font-normal ml-2">
                    (wd {innings.wides}, nb {innings.noBalls}, b {innings.byes}, lb{" "}
                    {innings.legByes}, pen {innings.penaltyRuns})
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold font-mono">{extras}</TableCell>
                <TableCell colSpan={4} />
              </TableRow>
              <TableRow className="bg-muted/60 font-black text-sm">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-mono text-base">
                  {innings.runs}/{Math.min(6, innings.wickets)}
                </TableCell>
                <TableCell colSpan={4} className="text-right text-xs font-mono text-muted-foreground">
                  {ballsToOversText(innings.balls)} overs
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Did Not Bat Section */}
        {didNotBat.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs border rounded-lg p-3 bg-muted/10">
            <span className="font-bold text-muted-foreground">Did not bat:</span>
            {didNotBat.map((p, idx) => (
              <span key={p.id} className="font-medium text-foreground">
                <PlayerLink playerId={p.id} name={p.name} />
                {idx < didNotBat.length - 1 ? "," : ""}
              </span>
            ))}
          </div>
        )}

        {/* Fall of Wickets (FOW) Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" /> Fall of Wickets
            </h4>
            <Badge variant="outline" className="text-[10px] font-mono">
              {fallOfWickets.length} Wicket{fallOfWickets.length === 1 ? "" : "s"} Fallen
            </Badge>
          </div>

          {fallOfWickets.length === 0 ? (
            <div className="p-3 rounded-lg border border-dashed text-xs text-muted-foreground text-center bg-muted/5">
              No wickets have fallen in this innings yet.
            </div>
          ) : (
            <div className="space-y-2">
              {/* Summary Text Bar */}
              <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/15 text-xs text-muted-foreground leading-relaxed">
                <span className="font-bold text-rose-400 mr-1.5">FOW:</span>
                <span className="font-mono text-foreground">{fowString}</span>
              </div>

              {/* Structured FOW Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {fallOfWickets.map((fow) => (
                  <div
                    key={`${fow.wicketNumber}-${fow.playerId}`}
                    className="p-3 rounded-xl border bg-card/60 flex items-center justify-between text-xs hover:border-rose-500/30 transition-colors shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Badge className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0">
                          {fow.wicketNumber}
                          {fow.wicketNumber === 1
                            ? "st"
                            : fow.wicketNumber === 2
                              ? "nd"
                              : fow.wicketNumber === 3
                                ? "rd"
                                : "th"}{" "}
                          Wkt
                        </Badge>
                        <PlayerLink
                          playerId={fow.playerId}
                          name={fow.playerName}
                          className="font-bold text-foreground truncate max-w-[120px] sm:max-w-[140px]"
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {fow.dismissal ?? "dismissed"}
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-base font-black text-rose-400">
                        {fow.runs}/{fow.wicketNumber}
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {fow.overs || ballsToOversText(fow.balls)} ov
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Partnerships Section (Optional inside ScorecardView) */}
        {showPartnerships && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-amber-500" /> Batting Partnerships
              </h4>
              <Badge variant="outline" className="text-[10px] font-mono">
                {partnerships.length} Stand{partnerships.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {partnerships.length === 0 ? (
              <div className="p-3 rounded-lg border border-dashed text-xs text-muted-foreground text-center bg-muted/5">
                No partnerships recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {partnerships.map((p) => {
                  const totalRuns = Math.max(0, p.totalRuns);
                  const p1Share = totalRuns > 0 ? Math.round((p.player1Runs / totalRuns) * 100) : 50;
                  const p2Share = 100 - p1Share;
                  const runRate =
                    p.totalBalls > 0 ? ((p.totalRuns / p.totalBalls) * 6).toFixed(2) : "0.00";

                  return (
                    <div
                      key={`${p.wicketNumber}-${p.player1Id}-${p.player2Id}`}
                      className="p-3.5 rounded-xl border bg-card/70 space-y-2.5 shadow-sm hover:border-amber-500/30 transition-colors"
                    >
                      {/* Header: Stand & Total Runs */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-foreground">
                            {p.wicketNumber}
                            {p.wicketNumber === 1
                              ? "st"
                              : p.wicketNumber === 2
                                ? "nd"
                                : p.wicketNumber === 3
                                  ? "rd"
                                  : "th"}{" "}
                            Wicket Stand
                          </span>
                          {p.isUnbroken && (
                            <Badge className="bg-emerald-500/20 border-emerald-500/40 text-emerald-400 text-[10px] font-black px-1.5 py-0">
                              Unbroken *
                            </Badge>
                          )}
                        </div>
                        <div className="font-mono text-xs">
                          <span className="font-black text-amber-400 text-sm">{p.totalRuns}</span>{" "}
                          <span className="text-muted-foreground">
                            runs ({p.totalBalls}b, RR: {runRate})
                          </span>
                        </div>
                      </div>

                      {/* Split Visual Progress Bar */}
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                        <div
                          style={{ width: `${Math.max(10, Math.min(90, p1Share))}%` }}
                          className="bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                        />
                        <div
                          style={{ width: `${Math.max(10, Math.min(90, p2Share))}%` }}
                          className="bg-gradient-to-r from-sky-400 to-sky-500 transition-all"
                        />
                      </div>

                      {/* Player Breakdown Row */}
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        {/* Player 1 */}
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          <PlayerLink
                            playerId={p.player1Id}
                            name={p.player1Name ?? "Batter 1"}
                            className="font-bold text-foreground truncate max-w-[110px] sm:max-w-[160px]"
                          />
                          <span className="font-mono text-muted-foreground text-[11px]">
                            {p.player1Runs} ({p.player1Balls}b)
                          </span>
                        </div>

                        {/* Player 2 */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-muted-foreground text-[11px]">
                            {p.player2Runs} ({p.player2Balls}b)
                          </span>
                          <PlayerLink
                            playerId={p.player2Id}
                            name={p.player2Name ?? "Batter 2"}
                            className="font-bold text-foreground truncate max-w-[110px] sm:max-w-[160px]"
                          />
                          <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bowling Table */}
        {(() => {
          const activeBowling = innings.bowling.filter(
            (b) => b.balls > 0 || b.wides > 0 || b.noBalls > 0 || b.runs > 0 || b.wickets > 0,
          );
          if (activeBowling.length === 0) return null;

          return (
            <div className="rounded-xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-xs">
                    <TableHead>Bowler</TableHead>
                    <TableHead className="text-right">Overs</TableHead>
                    <TableHead className="text-right">Maidens</TableHead>
                    <TableHead className="text-right">Runs</TableHead>
                    <TableHead className="text-right font-bold text-sky-500">Wickets</TableHead>
                    <TableHead className="text-right">Econ</TableHead>
                    <TableHead className="text-right">Wd</TableHead>
                    <TableHead className="text-right">Nb</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeBowling.map((b) => (
                    <TableRow key={b.playerId} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-sm">
                        <PlayerLink
                          playerId={b.playerId}
                          name={getPlayerDisplayName(b.playerId, b.playerName)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {ballsToOversText(b.balls)}
                      </TableCell>
                      <TableCell className="text-right font-mono">{b.maidens}</TableCell>
                      <TableCell className="text-right font-mono">{b.runs}</TableCell>
                      <TableCell className="text-right font-black text-sky-500 font-mono text-base">
                        {b.wickets}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : "0.00"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground text-xs">
                        {b.wides}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {b.noBalls}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

export function PartnershipsSection({
  innings,
  squadPlayers = [],
  title,
}: {
  innings: InningsData;
  squadPlayers?: Player[];
  title?: string;
}) {
  const partnerships = getInningsPartnerships(innings, squadPlayers);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="p-4 sm:p-5 border-b bg-muted/20">
        <CardTitle className="flex flex-wrap items-center justify-between text-base sm:text-lg gap-2">
          <span className="font-extrabold flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            {title ?? `${innings.battingTeamName ?? `Innings ${innings.inningsNumber}`} — Batting Partnerships`}
          </span>
          <Badge variant="outline" className="text-xs font-mono">
            {partnerships.length} Stand{partnerships.length === 1 ? "" : "s"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {partnerships.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed text-xs text-muted-foreground text-center bg-muted/5">
            No partnerships recorded yet for this innings.
          </div>
        ) : (
          <div className="space-y-3">
            {partnerships.map((p) => {
              const totalRuns = Math.max(0, p.totalRuns);
              const p1Share = totalRuns > 0 ? Math.round((p.player1Runs / totalRuns) * 100) : 50;
              const p2Share = 100 - p1Share;
              const runRate =
                p.totalBalls > 0 ? ((p.totalRuns / p.totalBalls) * 6).toFixed(2) : "0.00";

              return (
                <div
                  key={`${p.wicketNumber}-${p.player1Id}-${p.player2Id}`}
                  className="p-3.5 rounded-xl border bg-card/70 space-y-2.5 shadow-sm hover:border-amber-500/30 transition-colors"
                >
                  {/* Header: Stand & Total Runs */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-foreground">
                        {p.wicketNumber}
                        {p.wicketNumber === 1
                          ? "st"
                          : p.wicketNumber === 2
                            ? "nd"
                            : p.wicketNumber === 3
                              ? "rd"
                              : "th"}{" "}
                        Wicket Stand
                      </span>
                      {p.isUnbroken && (
                        <Badge className="bg-emerald-500/20 border-emerald-500/40 text-emerald-400 text-[10px] font-black px-1.5 py-0">
                          Unbroken *
                        </Badge>
                      )}
                    </div>
                    <div className="font-mono text-xs">
                      <span className="font-black text-amber-400 text-sm">{p.totalRuns}</span>{" "}
                      <span className="text-muted-foreground">
                        runs ({p.totalBalls}b, RR: {runRate})
                      </span>
                    </div>
                  </div>

                  {/* Split Visual Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
                    <div
                      style={{ width: `${Math.max(10, Math.min(90, p1Share))}%` }}
                      className="bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                    />
                    <div
                      style={{ width: `${Math.max(10, Math.min(90, p2Share))}%` }}
                      className="bg-gradient-to-r from-sky-400 to-sky-500 transition-all"
                    />
                  </div>

                  {/* Player Breakdown Row */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    {/* Player 1 */}
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      <PlayerLink
                        playerId={p.player1Id}
                        name={p.player1Name ?? "Batter 1"}
                        className="font-bold text-foreground truncate max-w-[110px] sm:max-w-[160px]"
                      />
                      <span className="font-mono text-muted-foreground text-[11px]">
                        {p.player1Runs} ({p.player1Balls}b)
                      </span>
                    </div>

                    {/* Player 2 */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-muted-foreground text-[11px]">
                        {p.player2Runs} ({p.player2Balls}b)
                      </span>
                      <PlayerLink
                        playerId={p.player2Id}
                        name={p.player2Name ?? "Batter 2"}
                        className="font-bold text-foreground truncate max-w-[110px] sm:max-w-[160px]"
                      />
                      <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
