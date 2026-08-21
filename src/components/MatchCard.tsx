import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/TeamBadge";
import { statusBadgeClass, ballsToOversText, formatMatchDay, type MatchStatus } from "@/lib/cricket";
import { CalendarDays, MapPin, Zap, Trophy, Target } from "lucide-react";
import type { HydratedMatch } from "@/lib/firestore";

// Re-export so pages that import from MatchCard can still get the type
export type { HydratedMatch };

export function MatchCard({ match }: { match: HydratedMatch }) {
  const to = `/live/${match.id}`;
  const isFinal = match.stage === "FINAL";
  const matchOvers = isFinal ? 5 : 4;
  const quotaBalls = matchOvers * 6;

  const innings = match.innings ?? [];
  const inn1 = innings.find((i) => i.inningsNumber === 1);
  const inn2 = innings.find((i) => i.inningsNumber === 2);
  const currentInn = inn2 ?? inn1;

  // Innings scores mapped to Team A and Team B
  const teamAScore = innings.find((i) => i.battingTeamId === match.teamAId);
  const teamBScore = innings.find((i) => i.battingTeamId === match.teamBId);

  // Active batting team in live match
  const currentlyBattingTeam = currentInn
    ? currentInn.battingTeamId === match.teamAId
      ? match.teamA
      : match.teamB
    : null;

  // Target and chase equation
  const target = inn1 && inn2 ? inn1.runs + 1 : null;
  const runsNeeded = target && inn2 ? Math.max(0, target - inn2.runs) : null;
  const ballsRemaining = inn2 ? Math.max(0, quotaBalls - inn2.balls) : null;
  const crr =
    currentInn && currentInn.balls > 0
      ? ((currentInn.runs / currentInn.balls) * 6).toFixed(2)
      : null;
  const rrr =
    runsNeeded !== null && ballsRemaining && ballsRemaining > 0
      ? ((runsNeeded / ballsRemaining) * 6).toFixed(2)
      : null;

  return (
    <Link to={to} className="block group">
      <Card
        className={`transition-all duration-200 border overflow-hidden ${
          match.status === "LIVE"
            ? "border-red-500/50 bg-gradient-to-br from-red-500/5 via-card to-card shadow-md ring-1 ring-red-500/20"
            : "hover:shadow-md hover:border-primary/40 bg-card"
        }`}
      >
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Header Row: Stage & Status */}
          <div className="flex items-center justify-between gap-2 border-b pb-2.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {match.stage === "FINAL" ? "🏆 Final Match" : `Match #${match.matchNumber}`} ·{" "}
              {formatMatchDay(match.day, match.date)}
            </span>
            <Badge
              variant="outline"
              className={
                match.status === "LIVE"
                  ? "bg-red-500/10 text-red-500 border-red-500/40 font-bold animate-pulse flex items-center gap-1.5"
                  : statusBadgeClass(match.status as MatchStatus)
              }
            >
              {match.status === "LIVE" && (
                <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-ping" />
              )}
              {match.status.replace("_", " ")}
            </Badge>
          </div>

          {/* Teams and Real-time Scores */}
          <div className="space-y-3">
            {/* Team A */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <TeamBadge
                  shortName={match.teamA?.shortName ?? "TBD"}
                  logoUrl={match.teamA?.logoUrl}
                  size="sm"
                />
                <div className="flex flex-col min-w-0">
                  <span
                    className={`font-bold text-sm sm:text-base truncate ${
                      currentlyBattingTeam?.id === match.teamAId && match.status === "LIVE"
                        ? "text-emerald-500 font-extrabold"
                        : "text-foreground"
                    }`}
                  >
                    {match.teamA?.name ?? "Rank 1"}
                  </span>
                  {currentlyBattingTeam?.id === match.teamAId && match.status === "LIVE" && (
                    <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                      🏏 Batting now
                    </span>
                  )}
                </div>
              </div>

              {teamAScore ? (
                <div className="text-right shrink-0 font-mono">
                  <span className="font-black text-base sm:text-lg text-foreground">
                    {teamAScore.runs}/{Math.min(5, teamAScore.wickets)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1.5 font-medium">
                    ({ballsToOversText(teamAScore.balls)}/{matchOvers} ov)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0 italic">Yet to bat</span>
              )}
            </div>

            {/* Team B */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <TeamBadge
                  shortName={match.teamB?.shortName ?? "TBD"}
                  logoUrl={match.teamB?.logoUrl}
                  size="sm"
                />
                <div className="flex flex-col min-w-0">
                  <span
                    className={`font-bold text-sm sm:text-base truncate ${
                      currentlyBattingTeam?.id === match.teamBId && match.status === "LIVE"
                        ? "text-emerald-500 font-extrabold"
                        : "text-foreground"
                    }`}
                  >
                    {match.teamB?.name ?? "Rank 2"}
                  </span>
                  {currentlyBattingTeam?.id === match.teamBId && match.status === "LIVE" && (
                    <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                      🏏 Batting now
                    </span>
                  )}
                </div>
              </div>

              {teamBScore ? (
                <div className="text-right shrink-0 font-mono">
                  <span className="font-black text-base sm:text-lg text-foreground">
                    {teamBScore.runs}/{Math.min(5, teamBScore.wickets)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1.5 font-medium">
                    ({ballsToOversText(teamBScore.balls)}/{matchOvers} ov)
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0 italic">Yet to bat</span>
              )}
            </div>
          </div>

          {/* Real-time Summary Card / Result Box */}
          {match.status === "LIVE" && currentInn && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-1 text-xs">
              <div className="flex items-center justify-between font-mono font-semibold text-foreground">
                <span>
                  CRR: <strong>{crr}</strong>
                </span>
                {rrr && (
                  <span>
                    RRR: <strong>{rrr}</strong>
                  </span>
                )}
              </div>
              {target && runsNeeded !== null && ballsRemaining !== null && (
                <div className="text-emerald-500 font-bold flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" />
                  Target: {target} (Need {runsNeeded} runs from {ballsRemaining} balls)
                </div>
              )}
              {!target && (
                <div className="text-muted-foreground font-medium">
                  1st Innings in progress · {ballsToOversText(currentInn.balls)}/{matchOvers} overs bowled
                </div>
              )}
            </div>
          )}

          {/* Completed Result Banner */}
          {(match.status === "COMPLETED" || match.resultText) && match.resultText && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 border border-emerald-500/30 text-center shadow-sm">
              <p className="text-xs sm:text-sm font-extrabold text-emerald-400 flex items-center justify-center gap-1.5 uppercase tracking-wide">
                <Trophy className="h-4 w-4 text-amber-400 shrink-0" /> {match.resultText}
              </p>
            </div>
          )}

          {/* Upcoming Match Info Footer */}
          {match.status === "UPCOMING" && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-xs text-muted-foreground">
              {match.date && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {match.date} {match.time ? `· ${match.time}` : ""}
                </span>
              )}
              {match.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {match.venue}
                </span>
              )}
              {!match.date && !match.venue && <span>Schedule to be announced</span>}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
