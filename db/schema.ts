import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  boolean,
  double,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Cricket Tournament
// ---------------------------------------------------------------------------

export const tournaments = mysqlTable("tournaments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 64 }),
  // Points system (admin editable)
  winPoints: int("winPoints").notNull().default(2),
  tiePoints: int("tiePoints").notNull().default(1),
  noResultPoints: int("noResultPoints").notNull().default(1),
  lossPoints: int("lossPoints").notNull().default(0),
  oversPerSide: int("oversPerSide").notNull().default(10),
  championTeamId: bigint("championTeamId", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Tournament = typeof tournaments.$inferSelect;

export const teams = mysqlTable("teams", {
  id: serial("id").primaryKey(),
  tournamentId: bigint("tournamentId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 16 }).notNull(),
  groupName: mysqlEnum("groupName", ["A", "B"]).notNull(),
  logoUrl: text("logoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Team = typeof teams.$inferSelect;

export const players = mysqlTable("players", {
  id: serial("id").primaryKey(),
  teamId: bigint("teamId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  jerseyNumber: int("jerseyNumber"),
  role: mysqlEnum("role", ["Batsman", "Bowler", "All-rounder", "Wicketkeeper"])
    .notNull()
    .default("Batsman"),
  battingStyle: varchar("battingStyle", { length: 128 }),
  bowlingStyle: varchar("bowlingStyle", { length: 128 }),
  photoUrl: text("photoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Player = typeof players.$inferSelect;

export const matches = mysqlTable("matches", {
  id: serial("id").primaryKey(),
  tournamentId: bigint("tournamentId", { mode: "number", unsigned: true }).notNull(),
  matchNumber: int("matchNumber").notNull(), // 1-9 league, 10 = final
  stage: mysqlEnum("stage", ["LEAGUE", "FINAL"]).notNull().default("LEAGUE"),
  day: mysqlEnum("day", ["FRIDAY", "SATURDAY", "SUNDAY"]).notNull(),
  teamAId: bigint("teamAId", { mode: "number", unsigned: true }),
  teamBId: bigint("teamBId", { mode: "number", unsigned: true }),
  date: varchar("date", { length: 32 }),
  time: varchar("time", { length: 32 }),
  venue: varchar("venue", { length: 255 }),
  status: mysqlEnum("status", [
    "UPCOMING",
    "LIVE",
    "COMPLETED",
    "ABANDONED",
    "NO_RESULT",
  ])
    .notNull()
    .default("UPCOMING"),
  tossWinnerId: bigint("tossWinnerId", { mode: "number", unsigned: true }),
  tossDecision: mysqlEnum("tossDecision", ["BAT", "BOWL"]),
  winningTeamId: bigint("winningTeamId", { mode: "number", unsigned: true }),
  resultText: varchar("resultText", { length: 512 }),
  playerOfMatchId: bigint("playerOfMatchId", { mode: "number", unsigned: true }),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Match = typeof matches.$inferSelect;

export const innings = mysqlTable(
  "innings",
  {
    id: serial("id").primaryKey(),
    matchId: bigint("matchId", { mode: "number", unsigned: true }).notNull(),
    inningsNumber: int("inningsNumber").notNull(), // 1 or 2
    battingTeamId: bigint("battingTeamId", { mode: "number", unsigned: true }).notNull(),
    bowlingTeamId: bigint("bowlingTeamId", { mode: "number", unsigned: true }).notNull(),
    runs: int("runs").notNull().default(0),
    wickets: int("wickets").notNull().default(0),
    balls: int("balls").notNull().default(0), // legal balls faced
    wides: int("wides").notNull().default(0),
    noBalls: int("noBalls").notNull().default(0),
    byes: int("byes").notNull().default(0),
    legByes: int("legByes").notNull().default(0),
    penaltyRuns: int("penaltyRuns").notNull().default(0),
    allOut: boolean("allOut").notNull().default(false),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    matchInningsIdx: uniqueIndex("innings_match_number_idx").on(
      table.matchId,
      table.inningsNumber,
    ),
  }),
);

export type Innings = typeof innings.$inferSelect;

export const battingScores = mysqlTable(
  "batting_scores",
  {
    id: serial("id").primaryKey(),
    inningsId: bigint("inningsId", { mode: "number", unsigned: true }).notNull(),
    playerId: bigint("playerId", { mode: "number", unsigned: true }).notNull(),
    battingOrder: int("battingOrder").notNull().default(1),
    runs: int("runs").notNull().default(0),
    balls: int("balls").notNull().default(0),
    fours: int("fours").notNull().default(0),
    sixes: int("sixes").notNull().default(0),
    isOut: boolean("isOut").notNull().default(false),
    dismissal: varchar("dismissal", { length: 255 }),
  },
  (table) => ({
    inningsPlayerIdx: uniqueIndex("batting_innings_player_idx").on(
      table.inningsId,
      table.playerId,
    ),
  }),
);

export type BattingScore = typeof battingScores.$inferSelect;

export const bowlingScores = mysqlTable(
  "bowling_scores",
  {
    id: serial("id").primaryKey(),
    inningsId: bigint("inningsId", { mode: "number", unsigned: true }).notNull(),
    playerId: bigint("playerId", { mode: "number", unsigned: true }).notNull(),
    balls: int("balls").notNull().default(0), // legal balls bowled
    maidens: int("maidens").notNull().default(0),
    runs: int("runs").notNull().default(0), // runs conceded attributed to bowler
    wickets: int("wickets").notNull().default(0),
    wides: int("wides").notNull().default(0),
    noBalls: int("noBalls").notNull().default(0),
  },
  (table) => ({
    inningsPlayerIdx: uniqueIndex("bowling_innings_player_idx").on(
      table.inningsId,
      table.playerId,
    ),
  }),
);

export type BowlingScore = typeof bowlingScores.$inferSelect;

// Optional ball-by-ball architecture
export const balls = mysqlTable("balls", {
  id: serial("id").primaryKey(),
  inningsId: bigint("inningsId", { mode: "number", unsigned: true }).notNull(),
  overNumber: int("overNumber").notNull(),
  ballNumber: int("ballNumber").notNull(),
  strikerId: bigint("strikerId", { mode: "number", unsigned: true }),
  nonStrikerId: bigint("nonStrikerId", { mode: "number", unsigned: true }),
  bowlerId: bigint("bowlerId", { mode: "number", unsigned: true }),
  runsOffBat: int("runsOffBat").notNull().default(0),
  extraType: mysqlEnum("extraType", ["NONE", "WIDE", "NO_BALL", "BYE", "LEG_BYE", "PENALTY"])
    .notNull()
    .default("NONE"),
  extraRuns: int("extraRuns").notNull().default(0),
  isWicket: boolean("isWicket").notNull().default(false),
  wicketType: varchar("wicketType", { length: 64 }),
  dismissedPlayerId: bigint("dismissedPlayerId", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Ball = typeof balls.$inferSelect;

// Standings — recomputed from scratch (idempotent) by the server after every
// result change. Never hand-edited except adminTiebreak.
export const standings = mysqlTable(
  "standings",
  {
    id: serial("id").primaryKey(),
    tournamentId: bigint("tournamentId", { mode: "number", unsigned: true }).notNull(),
    teamId: bigint("teamId", { mode: "number", unsigned: true }).notNull(),
    played: int("played").notNull().default(0),
    won: int("won").notNull().default(0),
    lost: int("lost").notNull().default(0),
    tied: int("tied").notNull().default(0),
    noResult: int("noResult").notNull().default(0),
    points: int("points").notNull().default(0),
    runsFor: int("runsFor").notNull().default(0),
    ballsFor: int("ballsFor").notNull().default(0),
    runsAgainst: int("runsAgainst").notNull().default(0),
    ballsAgainst: int("ballsAgainst").notNull().default(0),
    nrr: double("nrr").notNull().default(0),
    position: int("position").notNull().default(0),
    qualified: boolean("qualified").notNull().default(false),
    adminTiebreak: int("adminTiebreak").notNull().default(0), // higher wins ties
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tournamentTeamIdx: uniqueIndex("standings_tournament_team_idx").on(
      table.tournamentId,
      table.teamId,
    ),
  }),
);

export type Standing = typeof standings.$inferSelect;
