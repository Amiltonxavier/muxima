import type { FastifyInstance } from "fastify";
import { successResponse } from "../../shared/http/response";
import { NotificationService } from "./service";

export async function notificationRoutes(app: FastifyInstance) {
	app.get("/api/v1/notifications", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const notifications = await NotificationService.findByUserId(userId);
		return successResponse(notifications);
	});

	app.get("/api/v1/notifications/unread-count", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const count = await NotificationService.getUnreadCount(userId);
		return successResponse({ count });
	});

	app.patch("/api/v1/notifications/:id/read", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const notification = await NotificationService.markAsRead(id);
		return successResponse(notification);
	});

	app.patch("/api/v1/notifications/read-all", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		await NotificationService.markAllAsRead(userId);
		return successResponse({ success: true });
	});

	app.delete("/api/v1/notifications/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		await NotificationService.delete(id);
		return reply.status(204).send();
	});

	app.delete("/api/v1/notifications", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		await NotificationService.deleteAll(userId);
		return reply.status(204).send();
	});
}
