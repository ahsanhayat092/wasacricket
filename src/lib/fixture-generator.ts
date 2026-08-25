/**
 * Automated Round-Robin Fixture and Schedule Generator
 * Supports Single Round-Robin, Double Round-Robin, Group Stages,
 * and automated date/time slot distribution.
 */

import type { MatchDay, TournamentFormatType, PlayoffFormatType } from "./firestore";

export type FormatPresetConfig = {
  name: string;
  description: string;
  formatType: TournamentFormatType;
  oversPerSide: number;
  maxOverPerBowler: number;
  playersPerTeam: number;
  maxWickets: number;
  allowLastManStanding: boolean;
  wideRuns: number;
  noBallRuns: number;
  freeHitEnabled: boolean;
  playoffFormat: PlayoffFormatType;
  defaultMatchDurationMinutes: number;
};

export const FORMAT_PRESETS: Record<TournamentFormatType, FormatPresetConfig> = {
  TAPE_BALL_INDOOR: {
    name: "Indoor / Tape-Ball (Corporate/Box)",
    description: "Fast-paced tape-ball or indoor cricket with 6 starters, last-man standing, and strict 1-over bowler limits.",
    formatType: "TAPE_BALL_INDOOR",
    oversPerSide: 4,
    maxOverPerBowler: 1,
    playersPerTeam: 6,
    maxWickets: 6,
    allowLastManStanding: true,
    wideRuns: 1,
    noBallRuns: 1,
    freeHitEnabled: true,
    playoffFormat: "DIRECT_TOP2",
    defaultMatchDurationMinutes: 40,
  },
  T10: {
    name: "T10 League",
    description: "Exciting 10-over blast with max 2 overs per bowler and full 11-player squads.",
    formatType: "T10",
    oversPerSide: 10,
    maxOverPerBowler: 2,
    playersPerTeam: 11,
    maxWickets: 10,
    allowLastManStanding: false,
    wideRuns: 1,
    noBallRuns: 1,
    freeHitEnabled: true,
    playoffFormat: "PAGE_PLAYOFF_TOP3",
    defaultMatchDurationMinutes: 90,
  },
  T20: {
    name: "T20 Standard",
    description: "Official 20-over format, 4 overs per bowler max, standard ICC rules.",
    formatType: "T20",
    oversPerSide: 20,
    maxOverPerBowler: 4,
    playersPerTeam: 11,
    maxWickets: 10,
    allowLastManStanding: false,
    wideRuns: 1,
    noBallRuns: 1,
    freeHitEnabled: true,
    playoffFormat: "IPL_TOP4",
    defaultMatchDurationMinutes: 180,
  },
  ODI: {
    name: "One Day (ODI)",
    description: "50-over match with 10 overs per bowler max and powerplays.",
    formatType: "ODI",
    oversPerSide: 50,
    maxOverPerBowler: 10,
    playersPerTeam: 11,
    maxWickets: 10,
    allowLastManStanding: false,
    wideRuns: 1,
    noBallRuns: 1,
    freeHitEnabled: true,
    playoffFormat: "SEMI_FINALS",
    defaultMatchDurationMinutes: 420,
  },
  TEST: {
    name: "Multi-Day Test",
    description: "Unlimited overs, two innings per side with follow-on rules.",
    formatType: "TEST",
    oversPerSide: 90,
    maxOverPerBowler: 90,
    playersPerTeam: 11,
    maxWickets: 10,
    allowLastManStanding: false,
    wideRuns: 1,
    noBallRuns: 1,
    freeHitEnabled: false,
    playoffFormat: "DIRECT_TOP2",
    defaultMatchDurationMinutes: 480,
  },
  CUSTOM: {
    name: "Custom Format",
    description: "Fully customized rules, custom overs, custom bowler quotas, and scoring configurations.",
    formatType: "CUSTOM",
    oversPerSide: 6,
    maxOverPerBowler: 2,
    playersPerTeam: 8,
    maxWickets: 8,
    allowLastManStanding: false,
    wideRuns: 1,
    noBallRuns: 1,
    freeHitEnabled: true,
    playoffFormat: "DIRECT_TOP2",
    defaultMatchDurationMinutes: 60,
  },
};

export type GeneratedFixture = {
  matchNumber: number;
  stage: "LEAGUE" | "PLAYOFF" | "FINAL";
  round: number;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  day: MatchDay;
  date: string;
  time: string;
  venue: string;
};

const DAY_NAMES: MatchDay[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/**
 * Generate standard Round-Robin pairs using the Polygon/Berger method
 */
export function generateRoundRobinPairings(teamIds: string[], doubleRoundRobin = false): Array<{ round: number; home: string; away: string }> {
  if (teamIds.length < 2) return [];

  const teams = [...teamIds];
  // If odd number of teams, add a dummy bye team
  const hasDummy = teams.length % 2 !== 0;
  if (hasDummy) {
    teams.push("__BYE__");
  }

  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  const pairings: Array<{ round: number; home: string; away: string }> = [];

  for (let r = 0; r < numRounds; r++) {
    for (let m = 0; m < matchesPerRound; m++) {
      const homeIdx = (r + m) % (numTeams - 1);
      let awayIdx = (numTeams - 1 - m + r) % (numTeams - 1);

      if (m === 0) {
        awayIdx = numTeams - 1;
      }

      const home = teams[homeIdx];
      const away = teams[awayIdx];

      if (home !== "__BYE__" && away !== "__BYE__") {
        // Alternate home and away across rounds for fairness
        if (r % 2 === 1 && m === 0) {
          pairings.push({ round: r + 1, home: away, away: home });
        } else {
          pairings.push({ round: r + 1, home, away });
        }
      }
    }
  }

  if (doubleRoundRobin) {
    const secondLeg = pairings.map((p) => ({
      round: p.round + numRounds,
      home: p.away,
      away: p.home,
    }));
    return [...pairings, ...secondLeg];
  }

  return pairings;
}

/**
 * Generate complete tournament schedule with dates, times, and venues.
 */
export function generateTournamentSchedule(options: {
  teams: Array<{ id: string; name: string }>;
  startDate: string; // ISO YYYY-MM-DD
  dailyStartTime?: string; // e.g. "20:00" or "09:00"
  matchDurationMinutes?: number; // e.g. 40
  matchesPerDay?: number; // e.g. 4
  venue?: string;
  doubleRoundRobin?: boolean;
}): GeneratedFixture[] {
  const {
    teams,
    startDate,
    dailyStartTime = "20:00",
    matchDurationMinutes = 45,
    matchesPerDay = 4,
    venue = "Askari XI, Lahore",
    doubleRoundRobin = false,
  } = options;

  const teamMap = new Map(teams.map((t) => [t.id, t.name]));
  const pairings = generateRoundRobinPairings(
    teams.map((t) => t.id),
    doubleRoundRobin,
  );

  const fixtures: GeneratedFixture[] = [];
  const baseDate = new Date(startDate);

  let currentDayIndex = 0;
  let matchesOnCurrentDay = 0;

  for (let i = 0; i < pairings.length; i++) {
    const pair = pairings[i];

    if (matchesOnCurrentDay >= matchesPerDay) {
      currentDayIndex++;
      matchesOnCurrentDay = 0;
    }

    const matchDate = new Date(baseDate);
    matchDate.setDate(baseDate.getDate() + currentDayIndex);

    const dayName = DAY_NAMES[matchDate.getDay()];
    const dateStr = matchDate.toISOString().split("T")[0];

    // Compute match start time
    const [startHourStr, startMinStr] = dailyStartTime.split(":");
    const startHour = parseInt(startHourStr || "20", 10);
    const startMin = parseInt(startMinStr || "0", 10);

    const slotMinutes = matchesOnCurrentDay * matchDurationMinutes;
    const matchTimeDate = new Date(matchDate);
    matchTimeDate.setHours(startHour, startMin + slotMinutes, 0, 0);

    const hours = matchTimeDate.getHours();
    const minutes = matchTimeDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const timeStr = `${displayHours}:${displayMinutes} ${ampm}`;

    fixtures.push({
      matchNumber: i + 1,
      stage: "LEAGUE",
      round: pair.round,
      teamAId: pair.home,
      teamBId: pair.away,
      teamAName: teamMap.get(pair.home) ?? "Team A",
      teamBName: teamMap.get(pair.away) ?? "Team B",
      day: dayName,
      date: dateStr,
      time: timeStr,
      venue,
    });

    matchesOnCurrentDay++;
  }

  return fixtures;
}
