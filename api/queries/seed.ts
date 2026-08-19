import { getDb } from "./connection";
import { tournaments, teams, matches } from "@db/schema";
import { eq } from "drizzle-orm";
import { recalculateStandings } from "./tournament";

const TEAM_SEED = [
  { name: "Wolves", shortName: "WOL", groupName: "A" as const },
  { name: "Lions", shortName: "LIO", groupName: "A" as const },
  { name: "Falcons", shortName: "FAL", groupName: "A" as const },
  { name: "Stallions", shortName: "STA", groupName: "B" as const },
  { name: "Dolphins", shortName: "DOL", groupName: "B" as const },
  { name: "Tigers", shortName: "TIG", groupName: "B" as const },
];

const FIXTURES: Array<{
  matchNumber: number;
  day: "FRIDAY" | "SATURDAY" | "SUNDAY";
  teamA: string;
  teamB: string;
}> = [
  { matchNumber: 1, day: "FRIDAY", teamA: "Wolves", teamB: "Stallions" },
  { matchNumber: 2, day: "FRIDAY", teamA: "Lions", teamB: "Dolphins" },
  { matchNumber: 3, day: "FRIDAY", teamA: "Falcons", teamB: "Tigers" },
  { matchNumber: 4, day: "FRIDAY", teamA: "Wolves", teamB: "Dolphins" },
  { matchNumber: 5, day: "SATURDAY", teamA: "Lions", teamB: "Tigers" },
  { matchNumber: 6, day: "SATURDAY", teamA: "Falcons", teamB: "Stallions" },
  { matchNumber: 7, day: "SATURDAY", teamA: "Wolves", teamB: "Tigers" },
  { matchNumber: 8, day: "SATURDAY", teamA: "Lions", teamB: "Stallions" },
  { matchNumber: 9, day: "SATURDAY", teamA: "Falcons", teamB: "Dolphins" },
];

/**
 * Seed the tournament, six teams and all 10 fixtures (9 league + final).
 * Idempotent: if teams already exist for the tournament it does nothing.
 */
export async function seedTournament() {
  const db = getDb();
  const existing = await db.select().from(tournaments).limit(1);
  let tournamentId: number;
  if (existing.length > 0) {
    tournamentId = existing[0].id;
  } else {
    const [{ id }] = await db
      .insert(tournaments)
      .values({ name: "T10 Cricket Championship", shortName: "T10" })
      .$returningId();
    tournamentId = id;
  }

  const existingTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId));
  if (existingTeams.length > 0) {
    return { seeded: false, tournamentId };
  }

  const teamIdByName = new Map<string, number>();
  for (const t of TEAM_SEED) {
    const [{ id }] = await db
      .insert(teams)
      .values({ tournamentId, ...t })
      .$returningId();
    teamIdByName.set(t.name, id);
  }

  for (const f of FIXTURES) {
    await db.insert(matches).values({
      tournamentId,
      matchNumber: f.matchNumber,
      stage: "LEAGUE",
      day: f.day,
      teamAId: teamIdByName.get(f.teamA)!,
      teamBId: teamIdByName.get(f.teamB)!,
      status: "UPCOMING",
    });
  }

  // Final — teams populated automatically once the league stage completes
  await db.insert(matches).values({
    tournamentId,
    matchNumber: 10,
    stage: "FINAL",
    day: "SUNDAY",
    teamAId: null,
    teamBId: null,
    status: "UPCOMING",
  });

  await recalculateStandings(tournamentId);
  return { seeded: true, tournamentId };
}
