import type { FastifyInstance } from "fastify";
import { requireSessionUserId } from "../../shared/auth/auth-middleware";
import {
	getEventIdForResource,
	requireEventAccess,
	requireEventMutable,
} from "../../shared/auth/event-access";
import { NotFoundError } from "../../shared/errors/app-error";
import { GUEST_CODES } from "../../shared/errors/codes";
import { listResponse, successResponse } from "../../shared/http/response";
import { getPaginationMeta, parsePagination } from "../../shared/utils/helpers";
import {
	VALID_GUEST_STATUSES,
	VALID_GUEST_TYPES,
	validateEnum,
} from "../../shared/utils/validate-enum";
import {
	assignTableSchema,
	createGuestSchema,
	createTableSchema,
	updateGuestSchema,
} from "./schemas";
import { GuestService } from "./service";

export async function guestRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/guests", async (request) => {
		const userId = requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventAccess(userId, eventId);
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
			status: validateEnum(query.status, VALID_GUEST_STATUSES, "status"),
			type: validateEnum(query.type, VALID_GUEST_TYPES, "type"),
		};
		const result = await GuestService.findByEventId(
			eventId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
	});

	app.post("/api/v1/events/:eventId/guests", async (request, reply) => {
		const userId = requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventMutable(userId, eventId);
		const data = createGuestSchema.parse(request.body);
		const guest = await GuestService.create(eventId, data);
		return reply.status(201).send(successResponse(guest));
	});

	app.patch("/api/v1/guests/:id", async (request) => {
		const userId = requireSessionUserId(request);
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("guest", id);
		if (!eventId)
			throw new NotFoundError("Convidado não encontrado", {
				code: GUEST_CODES.NOT_FOUND,
			});
		await requireEventMutable(userId, eventId);
		const data = updateGuestSchema.parse(request.body);
		const guest = await GuestService.update(id, data);
		return successResponse(guest);
	});

	app.delete("/api/v1/guests/:id", async (request, reply) => {
		const userId = requireSessionUserId(request);
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("guest", id);
		if (!eventId)
			throw new NotFoundError("Convidado não encontrado", {
				code: GUEST_CODES.NOT_FOUND,
			});
		await requireEventMutable(userId, eventId);
		await GuestService.delete(id);
		return reply.status(204).send();
	});

	app.get("/api/v1/events/:eventId/tables", async (request) => {
		const userId = requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventAccess(userId, eventId);
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
		};
		const result = await GuestService.getTables(
			eventId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
	});

	app.post("/api/v1/events/:eventId/tables", async (request, reply) => {
		const userId = requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventMutable(userId, eventId);
		const data = createTableSchema.parse(request.body);
		const table = await GuestService.createTable(eventId, data);
		return reply.status(201).send(successResponse(table));
	});

	app.post("/api/v1/tables/:tableId/guests", async (request, reply) => {
		const userId = requireSessionUserId(request);
		const { tableId } = request.params as { tableId: string };
		const { guestId } = assignTableSchema.parse(request.body);
		const eventId = await getEventIdForResource("guest", guestId);
		if (!eventId)
			throw new NotFoundError("Convidado não encontrado", {
				code: GUEST_CODES.NOT_FOUND,
			});
		await requireEventMutable(userId, eventId);
		await GuestService.assignToTable(tableId, guestId);
		return reply.status(201).send(successResponse({ success: true }));
	});

	app.delete(
		"/api/v1/tables/:tableId/guests/:guestId",
		async (request, reply) => {
			const userId = requireSessionUserId(request);
			const { tableId, guestId } = request.params as {
				tableId: string;
				guestId: string;
			};
			const eventId = await getEventIdForResource("guest", guestId);
			if (!eventId)
				throw new NotFoundError("Convidado não encontrado", {
					code: GUEST_CODES.NOT_FOUND,
				});
			await requireEventMutable(userId, eventId);
			await GuestService.removeFromTable(tableId, guestId);
			return reply.status(204).send();
		},
	);
}
