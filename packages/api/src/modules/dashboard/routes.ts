import type { FastifyInstance } from "fastify";
import { successResponse } from "../../shared/http/response";
import { DashboardService } from "./service";

export async function dashboardRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/dashboard", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const summary = await DashboardService.getEventSummary(eventId);
		return successResponse(summary);
	});
}
