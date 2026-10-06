import { PERMISSIONS } from "@muxima/permissions";
import type { FastifyInstance } from "fastify";
import { requireSessionUserId } from "../../shared/auth/auth-middleware";
import { requireEventPermission } from "../../shared/auth/authorization";
import { NotFoundError } from "../../shared/errors/app-error";
import { EVENT_CODES } from "../../shared/errors/codes";
import { successResponse } from "../../shared/http/response";
import { DashboardService } from "./service";

export async function dashboardRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/dashboard", async (request) => {
		const userId = await requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventPermission(userId, eventId, PERMISSIONS.DASHBOARD_READ);
		const summary = await DashboardService.getEventSummary(eventId, userId);
		if (!summary)
			throw new NotFoundError("Evento não encontrado", {
				code: EVENT_CODES.NOT_FOUND,
			});
		return successResponse(summary);
	});
}
