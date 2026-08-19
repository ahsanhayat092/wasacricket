import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ballsToOversText } from "@/lib/cricket";

type BattingRow = {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
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
  batting: BattingRow[];
  bowling: BowlingRow[];
};

export function ScorecardView({ innings }: { innings: InningsData }) {
  const extras =
    innings.wides + innings.noBalls + innings.byes + innings.legByes + innings.penaltyRuns;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>
            {innings.battingTeamName ?? `Innings ${innings.inningsNumber}`}
          </span>
          <span className="font-mono">
            {innings.runs}/{innings.wickets}
            <span className="text-sm text-muted-foreground ml-2">
              ({ballsToOversText(innings.balls)} ov)
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batter</TableHead>
                <TableHead>Dismissal</TableHead>
                <TableHead className="text-right">R</TableHead>
                <TableHead className="text-right">B</TableHead>
                <TableHead className="text-right">4s</TableHead>
                <TableHead className="text-right">6s</TableHead>
                <TableHead className="text-right">SR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {innings.batting.map((b) => (
                <TableRow key={b.playerId}>
                  <TableCell className="font-medium">{b.playerName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {b.isOut ? (b.dismissal ?? "out") : "not out"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{b.runs}</TableCell>
                  <TableCell className="text-right">{b.balls}</TableCell>
                  <TableCell className="text-right">{b.fours}</TableCell>
                  <TableCell className="text-right">{b.sixes}</TableCell>
                  <TableCell className="text-right">
                    {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40">
                <TableCell colSpan={2} className="font-medium">
                  Extras
                  <span className="text-xs text-muted-foreground ml-2">
                    (wd {innings.wides}, nb {innings.noBalls}, b {innings.byes}, lb{" "}
                    {innings.legByes}, pen {innings.penaltyRuns})
                  </span>
                </TableCell>
                <TableCell className="text-right font-semibold">{extras}</TableCell>
                <TableCell colSpan={4} />
              </TableRow>
              <TableRow className="bg-muted/60 font-bold">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right">
                  {innings.runs}/{innings.wickets}
                </TableCell>
                <TableCell colSpan={4} className="text-right">
                  {ballsToOversText(innings.balls)} overs
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {innings.bowling.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bowler</TableHead>
                  <TableHead className="text-right">O</TableHead>
                  <TableHead className="text-right">M</TableHead>
                  <TableHead className="text-right">R</TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">Econ</TableHead>
                  <TableHead className="text-right">Wd</TableHead>
                  <TableHead className="text-right">Nb</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {innings.bowling.map((b) => (
                  <TableRow key={b.playerId}>
                    <TableCell className="font-medium">{b.playerName}</TableCell>
                    <TableCell className="text-right">
                      {ballsToOversText(b.balls)}
                    </TableCell>
                    <TableCell className="text-right">{b.maidens}</TableCell>
                    <TableCell className="text-right">{b.runs}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {b.wickets}
                    </TableCell>
                    <TableCell className="text-right">
                      {b.balls > 0 ? ((b.runs / b.balls) * 6).toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right">{b.wides}</TableCell>
                    <TableCell className="text-right">{b.noBalls}</TableCell>
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
