/**
 * Server-side cricket calculation engine.
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
export function ballsToOversText(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
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
 *
 * @param ballsFaced actual legal balls faced
 * @param allOut whether the batting side was dismissed
 * @param quotaBalls full match quota (oversPerSide * 6)
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
    const wicketsRemaining = Math.max(1, 6 - innings2Wickets);
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
