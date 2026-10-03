import type { FastifyInstance } from "fastify";
import { requireSessionUserId } from "../../shared/auth/auth-middleware";
import { listResponse, successResponse } from "../../shared/http/response";
import { getPaginationMeta, parsePagination } from "../../shared/utils/helpers";
import {
	VALID_NOTIFICATION_TYPES,
	validateEnum,
} from "../../shared/utils/validate-enum";
import { NotificationService } from "./service";

export async function notificationRoutes(app: FastifyInstance) {
	app.get("/api/v1/notifications", async (request) => {
		const userId = requireSessionUserId(request);
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
			type: validateEnum(query.type, VALID_NOTIFICATION_TYPES, "type"),
			read: query.read !== undefined ? query.read === "true" : undefined,
		};
		const result = await NotificationService.findByUserId(
			userId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
	});

	app.get("/api/v1/notifications/unread-count", async (request) => {
		const userId = requireSessionUserId(request);
		const count = await NotificationService.getUnreadCount(userId);
		return successResponse({ count });
	});

	app.patch("/api/v1/notifications/:id/read", async (request) => {
		const userId = requireSessionUserId(request);
		const { id } = request.params as { id: string };
		const notification = await NotificationService.markAsRead(id, userId);
		return successResponse(notification);
	});

	app.patch("/api/v1/notifications/read-all", async (request) => {
		const userId = requireSessionUserId(request);
		await NotificationService.markAllAsRead(userId);
		return successResponse({ success: true });
	});

	app.delete("/api/v1/notifications/:id", async (request, reply) => {
		const userId = requireSessionUserId(request);
		const { id } = request.params as { id: string };
		await NotificationService.delete(id, userId);
		return reply.status(204).send();
	});

	app.delete("/api/v1/notifications", async (request, reply) => {
		const userId = requireSessionUserId(request);
		await NotificationService.deleteAll(userId);
		return reply.status(204).send();
	});
}
