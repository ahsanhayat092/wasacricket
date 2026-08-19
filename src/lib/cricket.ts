/**
 * Cricket calculation engine — pure functions, no side effects.
 *
 * IMPORTANT: cricket overs are NOT decimals. 8.4 overs = 52 balls.
 * All math here is done in integer balls; overs are only a display format.
 */

/** Convert an overs display value like 8.4 into total balls (52). */
export function oversToBalls(overs: number): number {
  const wholeOvers = Math.floor(overs);
  const extraBalls = Math.round((overs - wholeOvers) * 10);
  if (extraBalls < 0 || extraBalls > 5) {
    throw new Error(`Invalid overs value: ${overs}`);
  }
  return wholeOvers * 6 + extraBalls;
}

/** Format balls as cricket overs text: 52 -> "8.4". */
export function ballsToOversText(balls?: number | null): string {
  const b = Math.max(0, Number(balls) || 0);
  return `${Math.floor(b / 6)}.${b % 6}`;
}

/** Run rate from runs and balls (runs per 6-ball over). */
export function runRate(runs: number, balls: number): number {
  if (balls <= 0) return 0;
  return (runs / balls) * 6;
}

export interface NrrAggregate {
  runsFor: number;
  ballsFor: number;
  runsAgainst: number;
  ballsAgainst: number;
}

/**
 * Net Run Rate = average run rate scored − average run rate conceded,
 * computed over aggregate balls (not per-match averages).
 */
export function computeNrr(a: NrrAggregate): number {
  const rrFor = runRate(a.runsFor, a.ballsFor);
  const rrAgainst = runRate(a.runsAgainst, a.ballsAgainst);
  return rrFor - rrAgainst;
}

/**
 * Effective balls for NRR purposes for one innings.
 *
 * ICC-style rule:
 * - If a team is dismissed (all out) before using its full quota of overs,
 *   the FULL quota is used for NRR purposes.
 * - If a team successfully chases a target before its quota, the ACTUAL
 *   balls faced are used (chasing teams are never all out when they win).
 */
export function effectiveNrrBalls(
  ballsFaced: number,
  allOut: boolean,
  quotaBalls: number,
): number {
  if (allOut) return quotaBalls;
  return Math.min(ballsFaced, quotaBalls);
}

/** Required run rate for a chase. */
export function requiredRunRate(
  target: number,
  currentRuns: number,
  quotaBalls: number,
  ballsFaced: number,
): number {
  const runsNeeded = target - currentRuns;
  const ballsRemaining = quotaBalls - ballsFaced;
  if (ballsRemaining <= 0) return 0;
  return (runsNeeded / ballsRemaining) * 6;
}

export interface MatchScoreInput {
  innings1Runs: number;
  innings1Balls: number;
  innings1AllOut: boolean;
  innings1Wickets: number;
  innings2Runs: number | null;
  innings2Balls: number | null;
  innings2AllOut: boolean;
  innings2Wickets: number | null;
}

export type MatchOutcome =
  | { kind: "WIN"; winner: "TEAM_A" | "TEAM_B"; margin: string }
  | { kind: "TIE" }
  | { kind: "NO_RESULT" };

/**
 * Determine a match outcome from innings data.
 * teamA batted first in innings1, teamB in innings2.
 */
export function determineOutcome(score: MatchScoreInput): MatchOutcome {
  const { innings1Runs } = score;
  if (score.innings2Runs === null) return { kind: "NO_RESULT" };
  const innings2Runs = score.innings2Runs;
  const innings2Wickets = score.innings2Wickets ?? 0;

  if (innings2Runs > innings1Runs) {
    const wicketsRemaining = Math.max(1, 5 - innings2Wickets);
    return {
      kind: "WIN",
      winner: "TEAM_B",
      margin: `${wicketsRemaining} wicket${wicketsRemaining === 1 ? "" : "s"}`,
    };
  }
  if (innings2Runs === innings1Runs) {
    return { kind: "TIE" };
  }
  const margin = innings1Runs - innings2Runs;
  return {
    kind: "WIN",
    winner: "TEAM_A",
    margin: `${margin} run${margin === 1 ? "" : "s"}`,
  };
}

// ---------------------------------------------------------------------------
// UI helpers (formerly in src/lib/cricket.ts)
// ---------------------------------------------------------------------------

export type MatchStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "ABANDONED" | "NO_RESULT";

/** Format NRR with a leading + for positive values. */
export function fmtNrr(nrr: number): string {
  const sign = nrr >= 0 ? "+" : "";
  return `${sign}${nrr.toFixed(3)}`;
}

export function statusBadgeClass(status: MatchStatus): string {
  switch (status) {
    case "LIVE":
      return "border-red-500 text-red-500";
    case "COMPLETED":
      return "border-emerald-500 text-emerald-500";
    case "UPCOMING":
      return "border-sky-500 text-sky-500";
    case "ABANDONED":
    case "NO_RESULT":
      return "border-muted-foreground text-muted-foreground";
    default:
      return "";
  }
}

/** Generate or look up badge colors for teams based on their short name. */
export function teamColor(shortName?: string | null): string {
  if (!shortName) return "bg-slate-600";
  const name = shortName.toUpperCase();
  switch (name) {
    case "WOL":
      return "bg-indigo-600";
    case "LIO":
      return "bg-amber-600";
    case "FAL":
      return "bg-sky-600";
    case "STA":
      return "bg-purple-600";
    case "DOL":
      return "bg-teal-600";
    case "TIG":
      return "bg-orange-600";
    default: {
      const colors = [
        "bg-red-600",
        "bg-blue-600",
        "bg-emerald-600",
        "bg-violet-600",
        "bg-pink-600",
        "bg-cyan-600",
      ];
      let hash = 0;
      return colors[hash];
    }
  }
}

/** Format match day display text consistently */
export function formatMatchDay(day?: string | null, date?: string | null): string {
  if (!day && !date) return "";
  const d = (day || "").toUpperCase().trim();
  if (d === "FRIDAY" || d === "WEDNESDAY") return "Wed, 26 Aug";
  if (d === "SATURDAY" || d === "THURSDAY") return "Thu, 27 Aug";
  if (d === "SUNDAY") return "Sun (Finals)";
  return date ? `${day} · ${date}` : (day || "");
}

