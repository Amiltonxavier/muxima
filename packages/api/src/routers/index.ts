import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { budgetRouter } from "./budget";
import { checklistRouter } from "./checklist";
import { dashboardRouter } from "./dashboard";
import { dedicationsRouter } from "./dedications";
import { documentsRouter } from "./documents";
import { eventsRouter } from "./events";
import { foodPlanRouter } from "./food-plan";
import { guestsRouter } from "./guests";
import { inventoryRouter } from "./inventory";
import { invitationsRouter } from "./invitations";
import { membersRouter } from "./members";
import { notificationsRouter } from "./notifications";
import { suppliersRouter } from "./suppliers";
import { tasksRouter } from "./tasks";
import { usersRouter } from "./users";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	dashboard: dashboardRouter,
	events: eventsRouter,
	budget: budgetRouter,
	suppliers: suppliersRouter,
	foodPlan: foodPlanRouter,
	checklist: checklistRouter,
	guests: guestsRouter,
	invitations: invitationsRouter,
	tasks: tasksRouter,
	inventory: inventoryRouter,
	documents: documentsRouter,
	members: membersRouter,
	notifications: notificationsRouter,
	users: usersRouter,
	dedications: dedicationsRouter,
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
