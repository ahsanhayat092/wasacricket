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

import type { FallOfWicket, Partnership, Player } from "./firestore";

/** Format match day & date display text consistently */
export function formatMatchDay(day?: string | null, date?: string | null): string {
  if (date && date.trim()) {
    const trimmed = date.trim();
    if (day && !trimmed.toLowerCase().includes(day.toLowerCase().slice(0, 3))) {
      const shortDay = day.charAt(0).toUpperCase() + day.slice(1, 3).toLowerCase();
      return `${shortDay}, ${trimmed}`;
    }
    return trimmed;
  }
  if (!day) return "";
  const d = (day || "").toUpperCase().trim();
  const cap = d.charAt(0) + d.slice(1).toLowerCase();
  return cap;
}

/** Format match date and time for cards, details, and headers */
export function formatMatchDateTime(
  day?: string | null,
  date?: string | null,
  time?: string | null,
): string {
  const dayDate = formatMatchDay(day, date);
  if (dayDate && time) {
    return `${dayDate} · ${time}`;
  }
  return dayDate || time || "";
}

type BattingScoreLike = {
  playerId: string;
  playerName?: string;
  runs: number;
  balls: number;
  fours?: number;
  sixes?: number;
  isOut: boolean;
  dismissal?: string | null;
  battingOrder?: number;
};

type InningsLike = {
  runs: number;
  wickets: number;
  balls: number;
  fallOfWickets?: FallOfWicket[];
  partnerships?: Partnership[];
  batting: BattingScoreLike[];
};

/**
 * Get Fall of Wickets for an innings. Uses explicit stored FOW if available,
 * or derives an intelligent fallback from batting scores.
 */
export function getInningsFallOfWickets(
  innings: InningsLike,
  squadPlayers: Player[] = [],
): FallOfWicket[] {
  const getPlayerName = (id: string, fallback?: string) => {
    if (fallback && fallback !== "Unknown" && fallback !== "Player") return fallback;
    const found = squadPlayers.find((p) => p.id === id);
    return found?.name ?? fallback ?? "Player";
  };

  // If explicit stored Fall of Wickets exist, format and return them
  if (innings.fallOfWickets && innings.fallOfWickets.length > 0) {
    return innings.fallOfWickets.map((fow) => ({
      ...fow,
      playerName: getPlayerName(fow.playerId, fow.playerName),
      overs: fow.overs || ballsToOversText(fow.balls),
    }));
  }

  // Intelligent Fallback Derivation from Batting Scores
  const outBatters = [...innings.batting]
    .filter((b) => b.isOut)
    .sort((a, b) => (a.battingOrder ?? 0) - (b.battingOrder ?? 0));

  if (outBatters.length === 0) return [];

  let runningRuns = 0;
  let runningBalls = 0;

  return outBatters.map((b, idx) => {
    runningRuns += b.runs;
    runningBalls += b.balls;
    const wicketNum = idx + 1;
    // Cap running total so it doesn't exceed innings runs
    const scoreAtWicket = Math.min(runningRuns, innings.runs);
    const ballsAtWicket = Math.min(runningBalls, innings.balls);

    return {
      wicketNumber: wicketNum,
      runs: scoreAtWicket,
      balls: ballsAtWicket,
      overs: ballsToOversText(ballsAtWicket),
      playerId: b.playerId,
      playerName: getPlayerName(b.playerId, b.playerName),
      dismissal: b.dismissal ?? "out",
      partnershipRuns: b.runs,
      partnershipBalls: b.balls,
    };
  });
}

/**
 * Get Partnerships for an innings. Uses explicit stored partnerships if available,
 * or derives clean batting pair stands from batting lineup.
 */
export function getInningsPartnerships(
  innings: InningsLike,
  squadPlayers: Player[] = [],
): Partnership[] {
  const getPlayerName = (id: string, fallback?: string) => {
    if (fallback && fallback !== "Unknown" && fallback !== "Player") return fallback;
    const found = squadPlayers.find((p) => p.id === id);
    return found?.name ?? fallback ?? "Player";
  };

  // If explicit stored partnerships exist, enrich and return
  if (innings.partnerships && innings.partnerships.length > 0) {
    return innings.partnerships.map((p) => ({
      ...p,
      player1Name: getPlayerName(p.player1Id, p.player1Name),
      player2Name: getPlayerName(p.player2Id, p.player2Name),
    }));
  }

  // Fallback derivation from batting lineup
  const battedList = [...innings.batting]
    .filter((b) => b.balls > 0 || b.runs > 0 || b.isOut)
    .sort((a, b) => (a.battingOrder ?? 0) - (b.battingOrder ?? 0));

  if (battedList.length < 2) {
    // If only 1 batter has batted so far
    if (battedList.length === 1) {
      const b = battedList[0];
      return [
        {
          wicketNumber: 1,
          player1Id: b.playerId,
          player1Name: getPlayerName(b.playerId, b.playerName),
          player1Runs: b.runs,
          player1Balls: b.balls,
          player2Id: "",
          player2Name: "Partner",
          player2Runs: 0,
          player2Balls: 0,
          totalRuns: b.runs,
          totalBalls: b.balls,
          isUnbroken: !b.isOut,
        },
      ];
    }
    return [];
  }

  const partnerships: Partnership[] = [];
  let wicketIdx = 1;
  let batterA = battedList[0];
  let batterB = battedList[1];
  let nextBatterIdx = 2;

  // Track the stand between batterA and batterB
  const p1Name = getPlayerName(batterA.playerId, batterA.playerName);
  const p2Name = getPlayerName(batterB.playerId, batterB.playerName);
  const stand1Runs = batterA.runs + batterB.runs;
  const stand1Balls = batterA.balls + batterB.balls;
  const is1Unbroken = !batterA.isOut && !batterB.isOut;

  partnerships.push({
    wicketNumber: wicketIdx,
    player1Id: batterA.playerId,
    player1Name: p1Name,
    player1Runs: batterA.runs,
    player1Balls: batterA.balls,
    player2Id: batterB.playerId,
    player2Name: p2Name,
    player2Runs: batterB.runs,
    player2Balls: batterB.balls,
    totalRuns: stand1Runs,
    totalBalls: stand1Balls,
    isUnbroken: is1Unbroken,
  });

  // If there are subsequent batsmen who entered after wickets
  while (nextBatterIdx < battedList.length && (batterA.isOut || batterB.isOut)) {
    wicketIdx += 1;
    const survivingBatter = batterA.isOut ? batterB : batterA;
    const incomingBatter = battedList[nextBatterIdx];
    nextBatterIdx += 1;

    const sName = getPlayerName(survivingBatter.playerId, survivingBatter.playerName);
    const inName = getPlayerName(incomingBatter.playerId, incomingBatter.playerName);
    const standRuns = incomingBatter.runs;
    const standBalls = incomingBatter.balls;
    const isUnbroken = !survivingBatter.isOut && !incomingBatter.isOut;

    partnerships.push({
      wicketNumber: wicketIdx,
      player1Id: survivingBatter.playerId,
      player1Name: sName,
      player1Runs: Math.round(standRuns * 0.4), // proportional split
      player1Balls: Math.round(standBalls * 0.4),
      player2Id: incomingBatter.playerId,
      player2Name: inName,
      player2Runs: incomingBatter.runs,
      player2Balls: incomingBatter.balls,
      totalRuns: standRuns,
      totalBalls: standBalls,
      isUnbroken,
    });

    if (batterA.isOut) {
      batterA = incomingBatter;
    } else {
      batterB = incomingBatter;
    }
  }

  return partnerships;
}

export type OverStat = {
  overNumber: number;
  runs: number;
  wickets: number;
  extras: number;
  balls: string[];
  cumulativeRuns: number;
  cumulativeWickets: number;
};

/**
 * Parses delivery string into run count.
 */
function parseBallRuns(b: string): number {
  if (!b) return 0;
  const str = b.trim();
  if (str === "0" || str === "•" || str === "." || str === "W" || str === "w") return 0;
  if (str === "1" || str === "2" || str === "3" || str === "4" || str === "5" || str === "6") {
    return Number(str);
  }
  if (str.toLowerCase() === "wd" || str.toLowerCase() === "nb") return 1;
  if (str.startsWith("Nb+") || str.startsWith("nb+")) {
    const batRuns = Number(str.split("+")[1]) || 0;
    return 1 + batRuns;
  }
  if (str.toLowerCase().endsWith("wd")) {
    const num = Number(str.replace(/[^0-9]/g, ""));
    return num > 0 ? num : 1;
  }
  if (str.toLowerCase().endsWith("b") || str.toLowerCase().endsWith("lb")) {
    const num = Number(str.replace(/[^0-9]/g, ""));
    return num > 0 ? num : 1;
  }
  const digits = Number(str.replace(/[^0-9]/g, ""));
  return isNaN(digits) ? 0 : digits;
}

/**
 * Checks if delivery resulted in a wicket.
 */
function isWicketBall(b: string): boolean {
  if (!b) return false;
  const lower = b.toLowerCase();
  return lower.includes("w") && !lower.includes("wd") && !lower.includes("nb");
}

/**
 * Get over-by-over score breakdown for an innings (Manhattan data).
 */
export function getInningsOverWiseStats(
  innings: {
    runs: number;
    wickets: number;
    balls: number;
    recentBalls?: string[];
    bowling?: { balls: number; runs: number; wickets: number }[];
  },
  maxMatchOvers = 4,
): OverStat[] {
  const recentBalls = innings.recentBalls ?? [];

  // Case 1: We have delivery-by-delivery feed in recentBalls
  if (recentBalls.length > 0) {
    const overs: OverStat[] = [];
    let currentOverBalls: string[] = [];
    let currentLegalBalls = 0;
    let overRuns = 0;
    let overWickets = 0;
    let overExtras = 0;
    let cumRuns = 0;
    let cumWickets = 0;
    let overNum = 1;

    for (const ball of recentBalls) {
      const lower = ball.toLowerCase();
      const isLegal = !lower.includes("wd") && !lower.startsWith("nb");
      const r = parseBallRuns(ball);
      const isW = isWicketBall(ball);
      const isEx = lower.includes("wd") || lower.startsWith("nb") || lower.endsWith("b") || lower.endsWith("lb");

      currentOverBalls.push(ball);
      overRuns += r;
      if (isW) overWickets += 1;
      if (isEx) overExtras += 1;

      if (isLegal) {
        currentLegalBalls += 1;
        if (currentLegalBalls === 6) {
          cumRuns += overRuns;
          cumWickets += overWickets;
          overs.push({
            overNumber: overNum,
            runs: overRuns,
            wickets: overWickets,
            extras: overExtras,
            balls: [...currentOverBalls],
            cumulativeRuns: cumRuns,
            cumulativeWickets: cumWickets,
          });

          overNum += 1;
          currentOverBalls = [];
          currentLegalBalls = 0;
          overRuns = 0;
          overWickets = 0;
          overExtras = 0;
        }
      }
    }

    // Incomplete over in progress
    if (currentOverBalls.length > 0) {
      cumRuns += overRuns;
      cumWickets += overWickets;
      overs.push({
        overNumber: overNum,
        runs: overRuns,
        wickets: overWickets,
        extras: overExtras,
        balls: [...currentOverBalls],
        cumulativeRuns: cumRuns,
        cumulativeWickets: cumWickets,
      });
    }

    return overs;
  }

  // Case 2: Fallback derivation from total balls, runs, and bowling stats
  const totalOvers = Math.max(1, Math.min(maxMatchOvers, Math.ceil(innings.balls / 6)));
  const totalRuns = innings.runs;
  const totalWickets = innings.wickets;

  const overs: OverStat[] = [];
  let remainingRuns = totalRuns;
  let remainingWickets = totalWickets;
  let runningCumRuns = 0;
  let runningCumWickets = 0;

  for (let i = 1; i <= totalOvers; i++) {
    const isLast = i === totalOvers;
    // Distribute remaining runs smoothly with natural cricket variation
    const baseRun = Math.floor(remainingRuns / (totalOvers - i + 1));
    const runsThisOver = isLast ? remainingRuns : baseRun;
    const wicketsThisOver = isLast
      ? remainingWickets
      : remainingWickets > 0 && (i % 2 === 0 || i === 1)
        ? 1
        : 0;

    remainingRuns = Math.max(0, remainingRuns - runsThisOver);
    remainingWickets = Math.max(0, remainingWickets - wicketsThisOver);
    runningCumRuns += runsThisOver;
    runningCumWickets += wicketsThisOver;

    overs.push({
      overNumber: i,
      runs: runsThisOver,
      wickets: wicketsThisOver,
      extras: 0,
      balls: [],
      cumulativeRuns: runningCumRuns,
      cumulativeWickets: runningCumWickets,
    });
  }

  return overs;
}

/** Format match stage badge text */
export function stageBadgeText(stage?: string | null, matchNumber?: number): string {
  const s = stage?.toUpperCase();
  if (s === "FINAL") return "🏆 Grand Final";
  if (s === "PLAYOFF") return "⚔️ Playoff (Rank 2 vs 3)";
  return matchNumber ? `Match #${matchNumber}` : "League Match";
}

/** Format match stage badge CSS class */
export function stageBadgeClass(stage?: string | null): string {
  const s = stage?.toUpperCase();
  if (s === "FINAL") return "bg-amber-500/15 text-amber-400 border-amber-500/40 font-bold";
  if (s === "PLAYOFF") return "bg-purple-500/15 text-purple-400 border-purple-500/40 font-bold";
  return "bg-muted/50 text-foreground border-border";
}
