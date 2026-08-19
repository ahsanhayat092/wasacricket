import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  matches,
  teams,
  players,
  standings,
  innings,
  battingScores,
  bowlingScores,
} from "@db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getTournament } from "./queries/tournament";
import {
  getTournamentBattingStats,
  getTournamentBowlingStats,
  getTournamentSummaryStats,
} from "./queries/tournament";
import { seedTournament } from "./queries/seed";

async function requireTournament() {
  let t = await getTournament();
  if (!t) {
    await seedTournament();
    t = await getTournament();
  }
  if (!t) throw new Error("Tournament not initialized");
  return t;
}

async function hydrateMatch(m: typeof matches.$inferSelect) {
  const db = getDb();
  const ids = [m.teamAId, m.teamBId, m.tossWinnerId, m.winningTeamId].filter(
    (x): x is number => x !== null,
  );
  const teamRows = ids.length
    ? await db.select().from(teams).where(inArray(teams.id, ids))
    : [];
  const find = (id: number | null) => teamRows.find((t) => t.id === id) ?? null;
  return {
    ...m,
    teamA: find(m.teamAId),
    teamB: find(m.teamBId),
    tossWinner: find(m.tossWinnerId),
    winningTeam: find(m.winningTeamId),
  };
}

export const tournamentRouter = createRouter({
  tournament: publicQuery.query(async () => {
    return requireTournament();
  }),

  teams: publicQuery.query(async () => {
    const t = await requireTournament();
    return getDb().select().from(teams).where(eq(teams.tournamentId, t.id));
  }),

  team: publicQuery
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, input.teamId),
      });
      if (!team) throw new Error("Team not found");
      const teamPlayers = await db
        .select()
        .from(players)
        .where(eq(players.teamId, team.id));
      const teamMatches = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentId, team.tournamentId));
      const relevant = teamMatches.filter(
        (m) => m.teamAId === team.id || m.teamBId === team.id,
      );
      const hydrated = await Promise.all(relevant.map(hydrateMatch));
      const standing = await db.query.standings.findFirst({
        where: and(
          eq(standings.tournamentId, team.tournamentId),
          eq(standings.teamId, team.id),
        ),
      });
      return { team, players: teamPlayers, matches: hydrated, standing };
    }),

  schedule: publicQuery.query(async () => {
    const t = await requireTournament();
    const rows = await getDb()
      .select()
      .from(matches)
      .where(eq(matches.tournamentId, t.id))
      .orderBy(asc(matches.matchNumber));
    return Promise.all(rows.map(hydrateMatch));
  }),

  results: publicQuery.query(async () => {
    const t = await requireTournament();
    const rows = await getDb()
      .select()
      .from(matches)
      .where(eq(matches.tournamentId, t.id))
      .orderBy(asc(matches.matchNumber));
    const finished = rows.filter(
      (m) =>
        m.status === "COMPLETED" ||
        m.status === "NO_RESULT" ||
        m.status === "ABANDONED",
    );
    return Promise.all(finished.map(hydrateMatch));
  }),

  standings: publicQuery.query(async () => {
    const t = await requireTournament();
    const db = getDb();
    const rows = await db
      .select()
      .from(standings)
      .where(eq(standings.tournamentId, t.id))
      .orderBy(asc(standings.position));
    const teamRows = await db
      .select()
      .from(teams)
      .where(eq(teams.tournamentId, t.id));
    return rows.map((s) => ({
      ...s,
      team: teamRows.find((tm) => tm.id === s.teamId) ?? null,
    }));
  }),

  match: publicQuery
    .input(z.object({ matchId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, input.matchId),
      });
      if (!match) throw new Error("Match not found");
      const hydrated = await hydrateMatch(match);
      const matchInnings = await db
        .select()
        .from(innings)
        .where(eq(innings.matchId, match.id));
      const inningsIds = matchInnings.map((i) => i.id);
      const batting = inningsIds.length
        ? await db
            .select()
            .from(battingScores)
            .where(inArray(battingScores.inningsId, inningsIds))
        : [];
      const bowling = inningsIds.length
        ? await db
            .select()
            .from(bowlingScores)
            .where(inArray(bowlingScores.inningsId, inningsIds))
        : [];
      const allPlayers = await db.select().from(players);
      const playerName = (id: number) =>
        allPlayers.find((p) => p.id === id)?.name ?? "Unknown";

      const inningsData = matchInnings
        .sort((a, b) => a.inningsNumber - b.inningsNumber)
        .map((inn) => ({
          ...inn,
          batting: batting
            .filter((b) => b.inningsId === inn.id)
            .sort((a, b) => a.battingOrder - b.battingOrder)
            .map((b) => ({ ...b, playerName: playerName(b.playerId) })),
          bowling: bowling
            .filter((b) => b.inningsId === inn.id)
            .map((b) => ({ ...b, playerName: playerName(b.playerId) })),
        }));

      const pom = match.playerOfMatchId
        ? (allPlayers.find((p) => p.id === match.playerOfMatchId) ?? null)
        : null;

      return { match: hydrated, innings: inningsData, playerOfMatch: pom };
    }),

  overview: publicQuery.query(async () => {
    const t = await requireTournament();
    const db = getDb();
    const rows = await db
      .select()
      .from(matches)
      .where(eq(matches.tournamentId, t.id))
      .orderBy(asc(matches.matchNumber));
    const hydrated = await Promise.all(rows.map(hydrateMatch));
    const live = hydrated.filter((m) => m.status === "LIVE");
    const upcoming = hydrated.filter((m) => m.status === "UPCOMING");
    const finished = hydrated.filter(
      (m) => m.status === "COMPLETED" || m.status === "NO_RESULT",
    );
    const standingsRows = await db
      .select()
      .from(standings)
      .where(eq(standings.tournamentId, t.id))
      .orderBy(asc(standings.position));
    const teamRows = await db
      .select()
      .from(teams)
      .where(eq(teams.tournamentId, t.id));
    const standingsWithTeams = standingsRows.map((s) => ({
      ...s,
      team: teamRows.find((tm) => tm.id === s.teamId) ?? null,
    }));
    const batting = await getTournamentBattingStats(t.id);
    const bowling = await getTournamentBowlingStats(t.id);
    const champion = t.championTeamId
      ? (teamRows.find((tm) => tm.id === t.championTeamId) ?? null)
      : null;
    return {
      tournament: t,
      champion,
      live: live[0] ?? null,
      nextMatch: upcoming[0] ?? null,
      latestResult: finished[finished.length - 1] ?? null,
      upcoming: upcoming.slice(0, 4),
      recentResults: finished.slice(-4).reverse(),
      standings: standingsWithTeams,
      topBatsman: batting[0] ?? null,
      topBowler: bowling[0] ?? null,
    };
  }),

  statistics: publicQuery.query(async () => {
    const t = await requireTournament();
    return {
      batting: await getTournamentBattingStats(t.id),
      bowling: await getTournamentBowlingStats(t.id),
      summary: await getTournamentSummaryStats(t.id),
    };
  }),
});
