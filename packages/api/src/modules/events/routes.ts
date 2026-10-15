import { PERMISSIONS } from "@muxima/permissions";
import type { FastifyInstance } from "fastify";
import { requireSessionUserId } from "../../shared/auth/auth-middleware";
import {
	getUserPermissions,
	requirePermission,
} from "../../shared/auth/authorization";
import { listResponse, successResponse } from "../../shared/http/response";
import { getPaginationMeta, parsePagination } from "../../shared/utils/helpers";
import {
	VALID_EVENT_STATUSES,
	VALID_EVENT_TYPES,
	validateEnum,
} from "../../shared/utils/validate-enum";
import { createEventSchema, eventIdSchema, updateEventSchema } from "./schemas";
import { EventService } from "./service";

export async function eventRoutes(app: FastifyInstance) {
	// List events
	app.get("/api/v1/events", async (request) => {
		const userId = await requireSessionUserId(request);
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
			status: validateEnum(query.status, VALID_EVENT_STATUSES, "status"),
			type: validateEnum(query.type, VALID_EVENT_TYPES, "type"),
		};
		const result = await EventService.findByUserId(
			userId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
	});

	// Get event by ID
	app.get("/api/v1/events/:eventId", async (request) => {
		const userId = await requireSessionUserId(request);
		const { eventId } = eventIdSchema.parse(request.params);
		const event = await EventService.findById(eventId, userId);
		return successResponse(event);
	});

	// Create event
	app.post("/api/v1/events", async (request, reply) => {
		const userId = await requireSessionUserId(request);
		// Same account-level check as the oRPC `events.create`: the base `USER`
		// role from sign-up grants it, and the shared guards keep event-scoped
		// rights on the OWNER membership this write creates.
		requirePermission(
			await getUserPermissions(userId),
			PERMISSIONS.EVENT_CREATE,
		);
		const data = createEventSchema.parse(request.body);
		const event = await EventService.create(userId, data);
		return reply.status(201).send(successResponse(event));
	});

	// Update event
	app.patch("/api/v1/events/:eventId", async (request) => {
		const userId = await requireSessionUserId(request);
		const { eventId } = eventIdSchema.parse(request.params);
		const data = updateEventSchema.parse(request.body);
		const event = await EventService.update(eventId, userId, data);
		return successResponse(event);
	});

	// Delete event
	app.delete("/api/v1/events/:eventId", async (request, reply) => {
		const userId = await requireSessionUserId(request);
		const { eventId } = eventIdSchema.parse(request.params);
		await EventService.delete(eventId, userId);
		return reply.status(204).send();
	});
}
