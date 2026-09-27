import type { FastifyInstance } from "fastify";
import { dashboardRoutes } from "./modules/dashboard/routes";
import { documentRoutes } from "./modules/documents/routes";
import { eventRoutes } from "./modules/events/routes";
import { guestRoutes } from "./modules/guests/routes";
import { inventoryRoutes } from "./modules/inventory/routes";
import { memberRoutes } from "./modules/members/routes";
import { notificationRoutes } from "./modules/notifications/routes";
import { taskRoutes } from "./modules/tasks/routes";
import { userRoutes } from "./modules/users/routes";

export async function registerRoutes(app: FastifyInstance) {
	await app.register(eventRoutes);
	await app.register(memberRoutes);
	await app.register(guestRoutes);
	await app.register(taskRoutes);
	await app.register(inventoryRoutes);
	await app.register(documentRoutes);
	await app.register(notificationRoutes);
	await app.register(dashboardRoutes);
	await app.register(userRoutes);
}
