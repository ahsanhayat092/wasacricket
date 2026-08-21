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
import { ballsToOversText } from "@/lib/cricket";
import type { Player } from "@/lib/firestore";

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
  batting: BattingRow[];
  bowling: BowlingRow[];
};

export function ScorecardView({
  innings,
  squadPlayers = [],
}: {
  innings: InningsData;
  squadPlayers?: Player[];
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

  return (
    <Card className="border shadow-sm">
      <CardHeader className="p-4 sm:p-5 border-b bg-muted/20">
        <CardTitle className="flex flex-wrap items-center justify-between text-base sm:text-lg">
          <span className="font-extrabold">
            {innings.battingTeamName ?? `Innings ${innings.inningsNumber}`}
          </span>
          <span className="font-mono font-bold text-foreground">
            {innings.runs}/{Math.min(5, innings.wickets)}
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
                          <span>{name}</span>
                        </span>
                      ) : (
                        name
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
                  {innings.runs}/{Math.min(5, innings.wickets)}
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
                {p.name}
                {idx < didNotBat.length - 1 ? "," : ""}
              </span>
            ))}
          </div>
        )}

        {/* Bowling Table */}
        {innings.bowling.length > 0 && (
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
                {innings.bowling.map((b) => (
                  <TableRow key={b.playerId} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-sm">
                      {getPlayerDisplayName(b.playerId, b.playerName)}
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
        )}
      </CardContent>
    </Card>
  );
}
