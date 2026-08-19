import { relations } from "drizzle-orm";
import {
  tournaments,
  teams,
  players,
  matches,
  innings,
  battingScores,
  bowlingScores,
  balls,
  standings,
} from "./schema";

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  teams: many(teams),
  matches: many(matches),
  standings: many(standings),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [teams.tournamentId],
    references: [tournaments.id],
  }),
  players: many(players),
}));

export const playersRelations = relations(players, ({ one }) => ({
  team: one(teams, { fields: [players.teamId], references: [teams.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id],
  }),
  innings: many(innings),
}));

export const inningsRelations = relations(innings, ({ one, many }) => ({
  match: one(matches, { fields: [innings.matchId], references: [matches.id] }),
  battingScores: many(battingScores),
  bowlingScores: many(bowlingScores),
  balls: many(balls),
}));

export const battingScoresRelations = relations(battingScores, ({ one }) => ({
  innings: one(innings, {
    fields: [battingScores.inningsId],
    references: [innings.id],
  }),
  player: one(players, {
    fields: [battingScores.playerId],
    references: [players.id],
  }),
}));

export const bowlingScoresRelations = relations(bowlingScores, ({ one }) => ({
  innings: one(innings, {
    fields: [bowlingScores.inningsId],
    references: [innings.id],
  }),
  player: one(players, {
    fields: [bowlingScores.playerId],
    references: [players.id],
  }),
}));

export const ballsRelations = relations(balls, ({ one }) => ({
  innings: one(innings, { fields: [balls.inningsId], references: [innings.id] }),
}));

export const standingsRelations = relations(standings, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [standings.tournamentId],
    references: [tournaments.id],
  }),
  team: one(teams, { fields: [standings.teamId], references: [teams.id] }),
}));
