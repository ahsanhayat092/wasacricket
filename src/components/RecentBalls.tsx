import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface RecentBallsProps {
  balls?: string[];
  className?: string;
  maxOversToShow?: number;
}

interface OverGroup {
  overNumber: number;
  balls: string[];
  runs: number;
  wickets: number;
  isComplete: boolean;
}

/**
 * Checks if a delivery string counts as a legal ball in cricket.
 * Wides and No Balls do NOT count as legal deliveries.
 */
function isLegalBall(ball: string): boolean {
  const lower = ball.toLowerCase();
  return !lower.includes("wd") && !lower.includes("nb");
}

/**
 * Calculates runs scored from a delivery representation
 */
function parseDeliveryRuns(ball: string): number {
  if (ball === "W") return 0;
  if (ball === "•" || ball === "0") return 0;
  if (ball === "4") return 4;
  if (ball === "6") return 6;
  if (ball === "1") return 1;
  if (ball === "2") return 2;
  if (ball === "3") return 3;

  // Wides: "Wd" = 1, "2Wd" = 2, "5Wd" = 5
  if (ball.toLowerCase().includes("wd")) {
    const num = parseInt(ball, 10);
    return isNaN(num) ? 1 : num;
  }

  // No balls: "Nb" = 1, "Nb+1" = 2, "Nb+4" = 5, "Nb+6" = 7
  if (ball.toLowerCase().startsWith("nb")) {
    if (ball.includes("+")) {
      const extra = parseInt(ball.split("+")[1], 10);
      return 1 + (isNaN(extra) ? 0 : extra);
    }
    const num = parseInt(ball, 10);
    return isNaN(num) ? 1 : num;
  }

  // Byes/Leg byes: "1B", "2Lb", "4B"
  const num = parseInt(ball, 10);
  return isNaN(num) ? 0 : num;
}

export function RecentBalls({ balls = [], className, maxOversToShow = 4 }: RecentBallsProps) {
  const overGroups = useMemo<OverGroup[]>(() => {
    if (!balls || balls.length === 0) return [];

    const groups: OverGroup[] = [];
    let currentOverBalls: string[] = [];
    let legalCount = 0;
    let overNum = 1;
    let currentRuns = 0;
    let currentWickets = 0;

    for (const b of balls) {
      currentOverBalls.push(b);
      currentRuns += parseDeliveryRuns(b);
      if (b === "W") currentWickets += 1;

      if (isLegalBall(b)) {
        legalCount += 1;
      }

      if (legalCount === 6) {
        groups.push({
          overNumber: overNum,
          balls: currentOverBalls,
          runs: currentRuns,
          wickets: currentWickets,
          isComplete: true,
        });
        overNum += 1;
        currentOverBalls = [];
        legalCount = 0;
        currentRuns = 0;
        currentWickets = 0;
      }
    }

    // Incomplete over in progress
    if (currentOverBalls.length > 0) {
      groups.push({
        overNumber: overNum,
        balls: currentOverBalls,
        runs: currentRuns,
        wickets: currentWickets,
        isComplete: false,
      });
    }

    return groups;
  }, [balls]);

  if (!balls || balls.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground italic", className)}>
        <span>No deliveries recorded yet.</span>
      </div>
    );
  }

  const displayedGroups = overGroups.slice(-maxOversToShow);

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {displayedGroups.map((group, gIdx) => (
          <div key={group.overNumber} className="flex items-center gap-2">
            {/* Over Container Box */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-muted/40 border border-border/60 shadow-sm">
              {/* Over Title Pill */}
              <div className="px-2 py-1 rounded-lg bg-background/80 border border-border/50 text-[10px] font-mono font-bold tracking-tight text-muted-foreground flex items-center gap-1">
                <span>Ov {group.overNumber}</span>
                <span className="text-foreground font-black">({group.runs}r{group.wickets > 0 ? `·${group.wickets}w` : ""})</span>
              </div>

              {/* Delivery Balls in this Over */}
              <div className="flex items-center gap-1">
                {group.balls.map((ball, bIdx) => {
                  const isFour = ball === "4" || ball === "Nb+4";
                  const isSix = ball === "6" || ball === "Nb+6";
                  const isWicket = ball === "W";
                  const isExtra = ball.toLowerCase().includes("wd") || ball.toLowerCase().startsWith("nb");
                  const isDot = ball === "0" || ball === "•";

                  return (
                    <span
                      key={bIdx}
                      className={cn(
                        "h-7 min-w-7 px-1.5 rounded-full flex items-center justify-center font-mono font-extrabold text-[11px] border transition-transform hover:scale-110 select-none shadow-xs",
                        isWicket && "bg-rose-600 text-white border-rose-500 shadow-rose-600/30 animate-pulse",
                        isFour && "bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30",
                        isSix && "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-purple-600/30",
                        isExtra && "bg-amber-500/20 text-amber-500 border-amber-500/40",
                        isDot && "bg-muted/80 text-muted-foreground border-transparent",
                        !isWicket && !isFour && !isSix && !isExtra && !isDot && "bg-sky-500/15 text-sky-400 border-sky-500/30"
                      )}
                    >
                      {isDot ? "•" : ball}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Clear Separator Divider between Overs */}
            {gIdx < displayedGroups.length - 1 && (
              <div className="h-5 w-[1.5px] bg-border/80 hidden sm:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
