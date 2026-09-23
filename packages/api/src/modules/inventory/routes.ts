import db from "@muxima/db";
import type { FastifyInstance } from "fastify";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../../shared/auth/event-access";
import { listResponse, successResponse } from "../../shared/http/response";
import { getPaginationMeta, parsePagination } from "../../shared/utils/helpers";
import {
	VALID_INVENTORY_CATEGORIES,
	VALID_INVENTORY_STATUSES,
	validateEnum,
} from "../../shared/utils/validate-enum";
import {
	addMovementSchema,
	createInventoryItemSchema,
	updateInventoryItemSchema,
} from "./schemas";
import { InventoryService } from "./service";

export async function inventoryRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/inventory", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
			category: validateEnum(query.category, VALID_INVENTORY_CATEGORIES),
			status: validateEnum(query.status, VALID_INVENTORY_STATUSES),
			vendorId: query.vendorId || undefined,
		};
		const result = await InventoryService.list(
			db,
			eventId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
	});

	app.get("/api/v1/events/:eventId/inventory/stats", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		await requireEventAccess(userId, eventId);
		const stats = await InventoryService.getStats(db, eventId);
		return successResponse(stats);
	});

	app.post("/api/v1/events/:eventId/inventory", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const data = createInventoryItemSchema.parse(request.body);
		const item = await db.$transaction((tx) =>
			InventoryService.create(tx, eventId, userId, data),
		);
		return reply.status(201).send(successResponse(item));
	});

	app.patch("/api/v1/inventory/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("inventoryItem", id);
		if (!eventId)
			return reply.status(404).send({
				error: {
					code: "NOT_FOUND",
					message: "Item de inventário não encontrado",
				},
			});
		await requireEventAccess(userId, eventId);
		const data = updateInventoryItemSchema.parse(request.body);
		const item = await db.$transaction((tx) =>
			InventoryService.update(tx, id, data),
		);
		return successResponse(item);
	});

	app.delete("/api/v1/inventory/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("inventoryItem", id);
		if (!eventId)
			return reply.status(404).send({
				error: {
					code: "NOT_FOUND",
					message: "Item de inventário não encontrado",
				},
			});
		await requireEventAccess(userId, eventId);
		await InventoryService.delete(db, id);
		return reply.status(204).send();
	});

	app.get(
		"/api/v1/inventory/:inventoryItemId/movements",
		async (request, reply) => {
			const userId = request.session?.user?.id;
			if (!userId)
				return reply
					.status(401)
					.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
			const { inventoryItemId } = request.params as { inventoryItemId: string };
			const eventId = await getEventIdForResource(
				"inventoryItem",
				inventoryItemId,
			);
			if (!eventId)
				return reply.status(404).send({
					error: {
						code: "NOT_FOUND",
						message: "Item de inventário não encontrado",
					},
				});
			await requireEventAccess(userId, eventId);
			const history = await InventoryService.getHistory(db, inventoryItemId);
			return successResponse(history);
		},
	);

	app.post(
		"/api/v1/inventory/:inventoryItemId/movements",
		async (request, reply) => {
			const userId = request.session?.user?.id;
			if (!userId)
				return reply
					.status(401)
					.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
			const { inventoryItemId } = request.params as { inventoryItemId: string };
			const eventId = await getEventIdForResource(
				"inventoryItem",
				inventoryItemId,
			);
			if (!eventId)
				return reply.status(404).send({
					error: {
						code: "NOT_FOUND",
						message: "Item de inventário não encontrado",
					},
				});
			await requireEventAccess(userId, eventId);
			const data = addMovementSchema.parse(request.body);
			const movement = await db.$transaction((tx) =>
				InventoryService.addMovement(tx, inventoryItemId, userId, data),
			);
			return reply.status(201).send(successResponse(movement));
		},
	);
}
