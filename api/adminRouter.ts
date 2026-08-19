import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  tournaments,
  teams,
  players,
  matches,
  innings,
  battingScores,
  bowlingScores,
  standings,
} from "@db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  finalizeMatch,
  getTournamentSummaryStats,
  recalculateStandings,
  syncInningsTotals,
} from "./queries/tournament";
import { seedTournament } from "./queries/seed";

const battingEntry = z.object({
  playerId: z.number(),
  battingOrder: z.number().int().min(1),
  runs: z.number().int().min(0),
  balls: z.number().int().min(0),
  fours: z.number().int().min(0),
  sixes: z.number().int().min(0),
  isOut: z.boolean(),
  dismissal: z.string().max(255).optional(),
});

const bowlingEntry = z.object({
  playerId: z.number(),
  balls: z.number().int().min(0),
  maidens: z.number().int().min(0),
  runs: z.number().int().min(0),
  wickets: z.number().int().min(0),
  wides: z.number().int().min(0),
  noBalls: z.number().int().min(0),
});

async function getTournamentId(): Promise<number> {
  const t = await getDb().select().from(tournaments).limit(1);
  if (!t.length) throw new TRPCError({ code: "NOT_FOUND", message: "No tournament. Seed first." });
  return t[0].id;
}

export const adminRouter = createRouter({
  seed: adminQuery.mutation(async () => {
    return seedTournament();
  }),

  dashboard: adminQuery.query(async () => {
    const db = getDb();
    const tournamentId = await getTournamentId();
    const allTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.tournamentId, tournamentId));
    const teamIds = allTeams.map((t) => t.id);
    const allPlayers = teamIds.length
      ? await db.select().from(players).where(inArray(players.teamId, teamIds))
      : [];
    const summary = await getTournamentSummaryStats(tournamentId);
    const topStandings = await db
      .select()
      .from(standings)
      .where(eq(standings.tournamentId, tournamentId))
      .orderBy(asc(standings.position))
      .limit(2);
    return {
      totalTeams: allTeams.length,
      totalPlayers: allPlayers.length,
      ...summary,
      rank1: topStandings[0]
        ? { ...topStandings[0], team: allTeams.find((t) => t.id === topStandings[0].teamId) }
        : null,
      rank2: topStandings[1]
        ? { ...topStandings[1], team: allTeams.find((t) => t.id === topStandings[1].teamId) }
        : null,
    };
  }),

  updateSettings: adminQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        shortName: z.string().max(64).optional(),
        winPoints: z.number().int().min(0),
        tiePoints: z.number().int().min(0),
        noResultPoints: z.number().int().min(0),
        lossPoints: z.number().int().min(0),
        oversPerSide: z.number().int().min(1).max(50),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const tournamentId = await getTournamentId();
      await db.update(tournaments).set(input).where(eq(tournaments.id, tournamentId));
      await recalculateStandings(tournamentId);
      return { ok: true };
    }),

  upsertTeam: adminQuery
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1).max(255),
        shortName: z.string().min(1).max(16),
        groupName: z.enum(["A", "B"]),
        logoUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const tournamentId = await getTournamentId();
      if (input.id) {
        await db
          .update(teams)
          .set({
            name: input.name,
            shortName: input.shortName,
            groupName: input.groupName,
            logoUrl: input.logoUrl ?? null,
          })
          .where(eq(teams.id, input.id));
        return { id: input.id };
      }
      const [{ id }] = await db
        .insert(teams)
        .values({
          tournamentId,
          name: input.name,
          shortName: input.shortName,
          groupName: input.groupName,
          logoUrl: input.logoUrl ?? null,
        })
        .$returningId();
      await recalculateStandings(tournamentId);
      return { id };
    }),

  deleteTeam: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const tournamentId = await getTournamentId();
      const used = await db
        .select()
        .from(matches)
        .where(eq(matches.tournamentId, tournamentId));
      const referenced = used.some(
        (m) => m.teamAId === input.id || m.teamBId === input.id,
      );
      if (referenced) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Team is referenced by fixtures and cannot be deleted.",
        });
      }
      await db.delete(players).where(eq(players.teamId, input.id));
      await db.delete(teams).where(eq(teams.id, input.id));
      return { ok: true };
    }),

  upsertPlayer: adminQuery
    .input(
      z.object({
        id: z.number().optional(),
        teamId: z.number(),
        name: z.string().min(1).max(255),
        jerseyNumber: z.number().int().min(0).max(999).optional(),
        role: z.enum(["Batsman", "Bowler", "All-rounder", "Wicketkeeper"]),
        battingStyle: z.string().max(128).optional(),
        bowlingStyle: z.string().max(128).optional(),
        photoUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const values = {
        teamId: input.teamId,
        name: input.name,
        jerseyNumber: input.jerseyNumber ?? null,
        role: input.role,
        battingStyle: input.battingStyle ?? null,
        bowlingStyle: input.bowlingStyle ?? null,
        photoUrl: input.photoUrl ?? null,
      };
      if (input.id) {
        await db.update(players).set(values).where(eq(players.id, input.id));
        return { id: input.id };
      }
      const [{ id }] = await db.insert(players).values(values).$returningId();
      return { id };
    }),

  deletePlayer: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const bat = await db
        .select()
        .from(battingScores)
        .where(eq(battingScores.playerId, input.id))
        .limit(1);
      const bowl = await db
        .select()
        .from(bowlingScores)
        .where(eq(bowlingScores.playerId, input.id))
        .limit(1);
      if (bat.length || bowl.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Player has scorecard entries and cannot be deleted.",
        });
      }
      await db.delete(players).where(eq(players.id, input.id));
      return { ok: true };
    }),

  updateMatchDetails: adminQuery
    .input(
      z.object({
        matchId: z.number(),
        date: z.string().max(32).optional(),
        time: z.string().max(32).optional(),
        venue: z.string().max(255).optional(),
        teamAId: z.number().nullable().optional(),
        teamBId: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, input.matchId),
      });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      const set: Record<string, unknown> = {
        date: input.date ?? null,
        time: input.time ?? null,
        venue: input.venue ?? null,
      };
      // Teams may only be changed while the match has not started
      if (match.status === "UPCOMING") {
        if (input.teamAId !== undefined) set.teamAId = input.teamAId;
        if (input.teamBId !== undefined) set.teamBId = input.teamBId;
      }
      await db.update(matches).set(set).where(eq(matches.id, input.matchId));
      return { ok: true };
    }),

  startMatch: adminQuery
    .input(
      z.object({
        matchId: z.number(),
        tossWinnerId: z.number(),
        tossDecision: z.enum(["BAT", "BOWL"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, input.matchId),
      });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      if (!match.teamAId || !match.teamBId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Both teams must be set before starting the match.",
        });
      }
      if (match.status !== "UPCOMING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Match has already started.",
        });
      }
      const battingFirstId =
        input.tossDecision === "BAT"
          ? input.tossWinnerId
          : input.tossWinnerId === match.teamAId
            ? match.teamBId
            : match.teamAId;
      const bowlingFirstId =
        battingFirstId === match.teamAId ? match.teamBId : match.teamAId;

      await db.transaction(async (tx) => {
        await tx
          .update(matches)
          .set({
            status: "LIVE",
            tossWinnerId: input.tossWinnerId,
            tossDecision: input.tossDecision,
          })
          .where(eq(matches.id, input.matchId));
        await tx.insert(innings).values({
          matchId: input.matchId,
          inningsNumber: 1,
          battingTeamId: battingFirstId!,
          bowlingTeamId: bowlingFirstId!,
        });
      });
      return { ok: true };
    }),

  saveInnings: adminQuery
    .input(
      z.object({
        matchId: z.number(),
        inningsNumber: z.union([z.literal(1), z.literal(2)]),
        wides: z.number().int().min(0),
        noBalls: z.number().int().min(0),
        byes: z.number().int().min(0),
        legByes: z.number().int().min(0),
        penaltyRuns: z.number().int().min(0),
        batting: z.array(battingEntry),
        bowling: z.array(bowlingEntry),
        completed: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, input.matchId),
      });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await db
        .select()
        .from(innings)
        .where(eq(innings.matchId, input.matchId));
      let inn = existing.find((i) => i.inningsNumber === input.inningsNumber);

      await db.transaction(async (tx) => {
        if (!inn) {
          const inn1 = existing.find((i) => i.inningsNumber === 1);
          let battingTeamId: number;
          let bowlingTeamId: number;
          if (input.inningsNumber === 1) {
            if (!match.teamAId || !match.teamBId)
              throw new TRPCError({ code: "BAD_REQUEST", message: "Teams not set" });
            battingTeamId = match.teamAId;
            bowlingTeamId = match.teamBId;
          } else {
            if (!inn1)
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Save innings 1 first",
              });
            battingTeamId = inn1.bowlingTeamId;
            bowlingTeamId = inn1.battingTeamId;
          }
          const [{ id }] = await tx
            .insert(innings)
            .values({ matchId: input.matchId, inningsNumber: input.inningsNumber, battingTeamId, bowlingTeamId })
            .$returningId();
          inn = {
            id,
            matchId: input.matchId,
            inningsNumber: input.inningsNumber,
            battingTeamId,
            bowlingTeamId,
          } as typeof innings.$inferSelect;
        }

        await tx
          .update(innings)
          .set({
            wides: input.wides,
            noBalls: input.noBalls,
            byes: input.byes,
            legByes: input.legByes,
            penaltyRuns: input.penaltyRuns,
            completed: input.completed,
          })
          .where(eq(innings.id, inn!.id));

        // Replace scorecard entries wholesale (idempotent corrections)
        await tx.delete(battingScores).where(eq(battingScores.inningsId, inn!.id));
        await tx.delete(bowlingScores).where(eq(bowlingScores.inningsId, inn!.id));
        if (input.batting.length) {
          await tx.insert(battingScores).values(
            input.batting.map((b) => ({
              inningsId: inn!.id,
              playerId: b.playerId,
              battingOrder: b.battingOrder,
              runs: b.runs,
              balls: b.balls,
              fours: b.fours,
              sixes: b.sixes,
              isOut: b.isOut,
              dismissal: b.dismissal ?? null,
            })),
          );
        }
        if (input.bowling.length) {
          await tx.insert(bowlingScores).values(
            input.bowling.map((b) => ({
              inningsId: inn!.id,
              playerId: b.playerId,
              balls: b.balls,
              maidens: b.maidens,
              runs: b.runs,
              wickets: b.wickets,
              wides: b.wides,
              noBalls: b.noBalls,
            })),
          );
        }
        if (match.status === "UPCOMING") {
          await tx
            .update(matches)
            .set({ status: "LIVE" })
            .where(eq(matches.id, input.matchId));
        }
      });

      const totals = await syncInningsTotals(inn!.id);
      return { ok: true, ...totals };
    }),

  completeMatch: adminQuery
    .input(
      z.object({
        matchId: z.number(),
        playerOfMatchId: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      if (input.playerOfMatchId) {
        await db
          .update(matches)
          .set({ playerOfMatchId: input.playerOfMatchId })
          .where(eq(matches.id, input.matchId));
      }
      return finalizeMatch(input.matchId);
    }),

  /** Reopen a finished match for correction, then recalculate. */
  reopenMatch: adminQuery
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, input.matchId),
      });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(matches)
        .set({
          status: "LIVE",
          winningTeamId: null,
          resultText: null,
          completedAt: null,
        })
        .where(eq(matches.id, input.matchId));
      if (match.stage === "FINAL") {
        await db
          .update(tournaments)
          .set({ championTeamId: null })
          .where(eq(tournaments.id, match.tournamentId));
      }
      await recalculateStandings(match.tournamentId);
      return { ok: true };
    }),

  setMatchStatus: adminQuery
    .input(
      z.object({
        matchId: z.number(),
        status: z.enum(["UPCOMING", "NO_RESULT", "ABANDONED"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, input.matchId),
      });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(matches)
        .set({
          status: input.status,
          ...(input.status === "NO_RESULT" || input.status === "ABANDONED"
            ? { completedAt: new Date(), resultText: input.status === "ABANDONED" ? "Match abandoned" : "No result" }
            : {}),
        })
        .where(eq(matches.id, input.matchId));
      await recalculateStandings(match.tournamentId);
      return { ok: true };
    }),

  recalculate: adminQuery.mutation(async () => {
    const tournamentId = await getTournamentId();
    const rows = await recalculateStandings(tournamentId);
    return { ok: true, teams: rows.length };
  }),

  setTiebreak: adminQuery
    .input(z.object({ teamId: z.number(), value: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const tournamentId = await getTournamentId();
      await db
        .update(standings)
        .set({ adminTiebreak: input.value })
        .where(
          and(
            eq(standings.tournamentId, tournamentId),
            eq(standings.teamId, input.teamId),
          ),
        );
      await recalculateStandings(tournamentId);
      return { ok: true };
    }),

  /** Everything the admin scorecard screen needs for one match. */
  matchWorkspace: adminQuery
    .input(z.object({ matchId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, input.matchId),
      });
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      const teamIds = [match.teamAId, match.teamBId].filter(
        (x): x is number => x !== null,
      );
      const teamRows = teamIds.length
        ? await db.select().from(teams).where(inArray(teams.id, teamIds))
        : [];
      const playerRows = teamIds.length
        ? await db.select().from(players).where(inArray(players.teamId, teamIds))
        : [];
      const matchInnings = await db
        .select()
        .from(innings)
        .where(eq(innings.matchId, match.id));
      const inningsIds = matchInnings.map((i) => i.id);
      const batting = inningsIds.length
        ? await db.select().from(battingScores).where(inArray(battingScores.inningsId, inningsIds))
        : [];
      const bowling = inningsIds.length
        ? await db.select().from(bowlingScores).where(inArray(bowlingScores.inningsId, inningsIds))
        : [];
      return {
        match,
        teams: teamRows,
        players: playerRows,
        innings: matchInnings.map((inn) => ({
          ...inn,
          batting: batting.filter((b) => b.inningsId === inn.id),
          bowling: bowling.filter((b) => b.inningsId === inn.id),
        })),
      };
    }),
});
