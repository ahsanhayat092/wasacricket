import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getInningsOverWiseStats } from "@/lib/cricket";
import type { Team } from "@/lib/firestore";
import { BarChart3, TrendingUp } from "lucide-react";

type InningsProp = {
  id?: string;
  inningsNumber: number;
  battingTeamId: string;
  runs: number;
  wickets: number;
  balls: number;
  recentBalls?: string[];
  battingTeamName?: string;
  bowling?: { balls: number; runs: number; wickets: number }[];
};

interface ManhattanGraphProps {
  inn1?: InningsProp | null;
  inn2?: InningsProp | null;
  teamA?: Team | null;
  teamB?: Team | null;
  maxOvers?: number;
}

export function ManhattanGraph({
  inn1,
  inn2,
  teamA,
  teamB,
  maxOvers = 4,
}: ManhattanGraphProps) {
  const [selectedView, setSelectedView] = useState<"both" | "inn1" | "inn2">("both");

  // Determine batting teams for Innings 1 and Innings 2
  const inn1TeamName = useMemo(() => {
    if (inn1?.battingTeamName) return inn1.battingTeamName.replace(" Innings", "");
    if (inn1 && teamA && inn1.battingTeamId === teamA.id) return teamA.name;
    if (inn1 && teamB && inn1.battingTeamId === teamB.id) return teamB.name;
    return teamA?.name ?? "Team 1";
  }, [inn1, teamA, teamB]);

  const inn2TeamName = useMemo(() => {
    if (inn2?.battingTeamName) return inn2.battingTeamName.replace(" Innings", "");
    if (inn2 && teamA && inn2.battingTeamId === teamA.id) return teamA.name;
    if (inn2 && teamB && inn2.battingTeamId === teamB.id) return teamB.name;
    return teamB?.name ?? "Team 2";
  }, [inn2, teamA, teamB]);

  // Compute over stats
  const inn1Overs = useMemo(
    () => (inn1 ? getInningsOverWiseStats(inn1, maxOvers) : []),
    [inn1, maxOvers],
  );

  const inn2Overs = useMemo(
    () => (inn2 ? getInningsOverWiseStats(inn2, maxOvers) : []),
    [inn2, maxOvers],
  );

  const totalOversToShow = Math.max(
    maxOvers,
    inn1Overs.length,
    inn2Overs.length,
  );

  // Merge over data for chart
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 1; i <= totalOversToShow; i++) {
      const o1 = inn1Overs.find((o) => o.overNumber === i);
      const o2 = inn2Overs.find((o) => o.overNumber === i);

      data.push({
        over: `Over ${i}`,
        overNum: i,
        inn1Runs: o1?.runs ?? 0,
        inn1Wickets: o1?.wickets ?? 0,
        inn1Balls: o1?.balls ?? [],
        inn1Cum: o1?.cumulativeRuns ?? 0,
        inn2Runs: o2?.runs ?? 0,
        inn2Wickets: o2?.wickets ?? 0,
        inn2Balls: o2?.balls ?? [],
        inn2Cum: o2?.cumulativeRuns ?? 0,
      });
    }
    return data;
  }, [totalOversToShow, inn1Overs, inn2Overs]);

  // Calculate highest runs in an over for Y-Axis domain
  const maxRunsInOver = Math.max(
    15,
    ...chartData.map((d) => Math.max(d.inn1Runs, d.inn2Runs)) + 4,
  );

  if (!inn1 && !inn2) {
    return (
      <Card className="p-8 text-center text-muted-foreground text-sm border shadow-sm">
        Manhattan graph will be available once the match begins and overs are bowled.
      </Card>
    );
  }

  return (
    <Card className="border shadow-md bg-card">
      <CardHeader className="p-4 sm:p-6 border-b bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              Over-by-Over Manhattan Graph
            </CardTitle>
            <CardDescription className="text-xs">
              Visual breakdown of runs scored and wickets taken per over
            </CardDescription>
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-lg border text-xs">
            <Button
              variant={selectedView === "both" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedView("both")}
              className="h-7 text-xs font-bold px-2.5"
            >
              Comparison
            </Button>
            {inn1 && (
              <Button
                variant={selectedView === "inn1" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedView("inn1")}
                className="h-7 text-xs font-bold px-2.5"
              >
                1st Inn ({inn1TeamName})
              </Button>
            )}
            {inn2 && (
              <Button
                variant={selectedView === "inn2" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedView("inn2")}
                className="h-7 text-xs font-bold px-2.5"
              >
                2nd Inn ({inn2TeamName})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Legend with wicket note */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            {(selectedView === "both" || selectedView === "inn1") && inn1 && (
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-indigo-500 shrink-0" />
                <span className="font-bold text-foreground">{inn1TeamName} (1st Inn)</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {inn1.runs}/{inn1.wickets}
                </Badge>
              </div>
            )}
            {(selectedView === "both" || selectedView === "inn2") && inn2 && (
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-amber-500 shrink-0" />
                <span className="font-bold text-foreground">{inn2TeamName} (2nd Inn)</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {inn2.runs}/{inn2.wickets}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span>🔴 Indicator denotes wicket fallen in that over</span>
          </div>
        </div>

        {/* Manhattan Bar Chart */}
        <div className="w-full h-[280px] sm:h-[340px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="over"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fontWeight: 600, fill: "currentColor" }}
              />
              <YAxis
                domain={[0, maxRunsInOver]}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "currentColor" }}
              />
              <Tooltip content={<CustomTooltip inn1Name={inn1TeamName} inn2Name={inn2TeamName} />} />

              {/* 1st Innings Bars */}
              {(selectedView === "both" || selectedView === "inn1") && inn1 && (
                <Bar
                  dataKey="inn1Runs"
                  name={inn1TeamName}
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                  // Custom label to show wicket markers on top of bars
                  label={(props: any) => {
                    const { x, y, width, index } = props;
                    const item = chartData[index];
                    if (!item || item.inn1Wickets <= 0) return null;
                    return (
                      <g>
                        <circle
                          cx={x + width / 2}
                          cy={y - 10}
                          r={7}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                        <text
                          x={x + width / 2}
                          y={y - 7}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={9}
                          fontWeight="bold"
                        >
                          {item.inn1Wickets}
                        </text>
                      </g>
                    );
                  }}
                />
              )}

              {/* 2nd Innings Bars */}
              {(selectedView === "both" || selectedView === "inn2") && inn2 && (
                <Bar
                  dataKey="inn2Runs"
                  name={inn2TeamName}
                  fill="#f59e0b"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                  label={(props: any) => {
                    const { x, y, width, index } = props;
                    const item = chartData[index];
                    if (!item || item.inn2Wickets <= 0) return null;
                    return (
                      <g>
                        <circle
                          cx={x + width / 2}
                          cy={y - 10}
                          r={7}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                        <text
                          x={x + width / 2}
                          y={y - 7}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={9}
                          fontWeight="bold"
                        >
                          {item.inn2Wickets}
                        </text>
                      </g>
                    );
                  }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Over-by-Over Detailed Comparison Table */}
        <div className="space-y-2.5 pt-2 border-t">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Over Breakdown Summary
            </h4>
            <span className="text-[11px] text-muted-foreground font-mono">
              Progression per Over
            </span>
          </div>

          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-xs">
                  <TableHead className="w-20">Over</TableHead>
                  {inn1 && (
                    <>
                      <TableHead className="text-right text-indigo-400 font-bold">
                        {inn1TeamName} Runs
                      </TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Wickets</TableHead>
                    </>
                  )}
                  {inn2 && (
                    <>
                      <TableHead className="text-right text-amber-400 font-bold">
                        {inn2TeamName} Runs
                      </TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Wickets</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((row) => (
                  <TableRow key={row.over} className="hover:bg-muted/30 text-xs">
                    <TableCell className="font-bold font-mono text-foreground">
                      {row.over}
                    </TableCell>

                    {inn1 && (
                      <>
                        <TableCell className="text-right font-black font-mono text-indigo-400 text-sm">
                          +{row.inn1Runs}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {row.inn1Cum}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.inn1Wickets > 0 ? (
                            <Badge className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0">
                              {row.inn1Wickets}w
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground font-mono">—</span>
                          )}
                        </TableCell>
                      </>
                    )}

                    {inn2 && (
                      <>
                        <TableCell className="text-right font-black font-mono text-amber-400 text-sm">
                          +{row.inn2Runs}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {row.inn2Cum}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.inn2Wickets > 0 ? (
                            <Badge className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0">
                              {row.inn2Wickets}w
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground font-mono">—</span>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label, inn1Name, inn2Name }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-xl border bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur-md text-xs space-y-2 min-w-[170px]">
      <div className="font-extrabold text-sm border-b pb-1 flex items-center justify-between">
        <span>{data.over}</span>
      </div>

      {payload.map((entry: any) => {
        const isInn1 = entry.dataKey === "inn1Runs";
        const teamName = isInn1 ? inn1Name : inn2Name;
        const runs = isInn1 ? data.inn1Runs : data.inn2Runs;
        const wickets = isInn1 ? data.inn1Wickets : data.inn2Wickets;
        const cumRuns = isInn1 ? data.inn1Cum : data.inn2Cum;
        const balls = isInn1 ? data.inn1Balls : data.inn2Balls;

        return (
          <div key={entry.dataKey} className="space-y-1 pt-1 border-t first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold" style={{ color: entry.fill }}>
                {teamName}:
              </span>
              <span className="font-mono font-black text-sm">{runs} runs</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Total at Over end:</span>
              <span className="font-mono font-bold">{cumRuns}</span>
            </div>
            {wickets > 0 && (
              <div className="flex items-center justify-between text-[11px] text-rose-500 font-bold">
                <span>Wickets lost:</span>
                <span>{wickets} 🔴</span>
              </div>
            )}
            {balls && balls.length > 0 && (
              <div className="text-[10px] text-muted-foreground font-mono pt-0.5 truncate max-w-[200px]">
                Deliveries: {balls.join(" · ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
