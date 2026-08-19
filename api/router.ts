import { authRouter } from "./auth-router";
import { tournamentRouter } from "./tournamentRouter";
import { adminRouter } from "./adminRouter";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  tournament: tournamentRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
