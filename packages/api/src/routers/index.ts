import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { budgetRouter } from "./budget";
import { documentsRouter } from "./documents";
import { eventsRouter } from "./events";
import { guestsRouter } from "./guests";
import { inventoryRouter } from "./inventory";
import { notificationsRouter } from "./notifications";
import { tasksRouter } from "./tasks";
import { usersRouter } from "./users";
import { vendorsRouter } from "./vendors";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	events: eventsRouter,
	budget: budgetRouter,
	vendors: vendorsRouter,
	guests: guestsRouter,
	tasks: tasksRouter,
	inventory: inventoryRouter,
	documents: documentsRouter,
	notifications: notificationsRouter,
	users: usersRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
