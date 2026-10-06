import db from "@muxima/db";
import { PERMISSIONS } from "@muxima/permissions";
import type { FastifyInstance } from "fastify";
import { requireSessionUserId } from "../../shared/auth/auth-middleware";
import {
	getEventIdForResource,
	requireEventPermission,
	requireEventPermissionMutable,
} from "../../shared/auth/authorization";
import { NotFoundError } from "../../shared/errors/app-error";
import { INVENTORY_CODES } from "../../shared/errors/codes";
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
	app.get("/api/v1/events/:eventId/inventory", async (request) => {
		const userId = await requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventPermission(userId, eventId, PERMISSIONS.INVENTORY_READ);
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
			category: validateEnum(
				query.category,
				VALID_INVENTORY_CATEGORIES,
				"category",
			),
			status: validateEnum(query.status, VALID_INVENTORY_STATUSES, "status"),
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

	app.get("/api/v1/events/:eventId/inventory/stats", async (request) => {
		const userId = await requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventPermission(userId, eventId, PERMISSIONS.INVENTORY_READ);
		const stats = await InventoryService.getStats(db, eventId);
		return successResponse(stats);
	});

	app.post("/api/v1/events/:eventId/inventory", async (request, reply) => {
		const userId = await requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventPermissionMutable(
			userId,
			eventId,
			PERMISSIONS.INVENTORY_CREATE,
		);
		const data = createInventoryItemSchema.parse(request.body);
		const item = await db.$transaction((tx) =>
			InventoryService.create(tx, eventId, userId, data),
		);
		return reply.status(201).send(successResponse(item));
	});

	app.patch("/api/v1/inventory/:id", async (request) => {
		const userId = await requireSessionUserId(request);
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("inventoryItem", id);
		if (!eventId)
			throw new NotFoundError("Item de inventário não encontrado", {
				code: INVENTORY_CODES.NOT_FOUND,
			});
		await requireEventPermissionMutable(
			userId,
			eventId,
			PERMISSIONS.INVENTORY_UPDATE,
		);
		const data = updateInventoryItemSchema.parse(request.body);
		const item = await db.$transaction((tx) =>
			InventoryService.update(tx, id, data),
		);
		return successResponse(item);
	});

	app.delete("/api/v1/inventory/:id", async (request, reply) => {
		const userId = await requireSessionUserId(request);
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("inventoryItem", id);
		if (!eventId)
			throw new NotFoundError("Item de inventário não encontrado", {
				code: INVENTORY_CODES.NOT_FOUND,
			});
		await requireEventPermissionMutable(
			userId,
			eventId,
			PERMISSIONS.INVENTORY_DELETE,
		);
		await InventoryService.delete(db, id);
		return reply.status(204).send();
	});

	app.get("/api/v1/inventory/:inventoryItemId/movements", async (request) => {
		const userId = await requireSessionUserId(request);
		const { inventoryItemId } = request.params as { inventoryItemId: string };
		const eventId = await getEventIdForResource(
			"inventoryItem",
			inventoryItemId,
		);
		if (!eventId)
			throw new NotFoundError("Item de inventário não encontrado", {
				code: INVENTORY_CODES.NOT_FOUND,
			});
		await requireEventPermission(userId, eventId, PERMISSIONS.INVENTORY_READ);
		const history = await InventoryService.getHistory(db, inventoryItemId);
		return successResponse(history);
	});

	app.post(
		"/api/v1/inventory/:inventoryItemId/movements",
		async (request, reply) => {
			const userId = await requireSessionUserId(request);
			const { inventoryItemId } = request.params as { inventoryItemId: string };
			const eventId = await getEventIdForResource(
				"inventoryItem",
				inventoryItemId,
			);
			if (!eventId)
				throw new NotFoundError("Item de inventário não encontrado", {
					code: INVENTORY_CODES.NOT_FOUND,
				});
			await requireEventPermissionMutable(
				userId,
				eventId,
				PERMISSIONS.INVENTORY_UPDATE,
			);
			const data = addMovementSchema.parse(request.body);
			const movement = await db.$transaction((tx) =>
				InventoryService.addMovement(tx, inventoryItemId, userId, data),
			);
			return reply.status(201).send(successResponse(movement));
		},
	);
}
