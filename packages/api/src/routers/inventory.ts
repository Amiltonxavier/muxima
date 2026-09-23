import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	addMovementSchema,
	createInventoryItemSchema,
	updateInventoryItemSchema,
} from "../modules/inventory/schemas";
import { InventoryService } from "../modules/inventory/service";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";
import { inventoryListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

export const inventoryRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }).merge(inventoryListInput))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const { page, limit } = parsePagination(input);

			const result = await InventoryService.list(
				db,
				input.eventId,
				{
					page,
					limit,
				},
				{
					search: input.search,
					category: input.category,
					status: input.status,
					vendorId: input.vendorId,
				},
			);

			return {
				data: result.data,
				meta: getPaginationMeta(result.total, page, limit),
			};
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const item = await InventoryService.getById(db, input.id);
			await requireEventAccess(context.session.user.id, item.eventId);
			return item;
		}),

	getStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return InventoryService.getStats(db, input.eventId);
		}),

	create: protectedProcedure
		.input(createInventoryItemSchema.extend({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return db.$transaction((tx) =>
				InventoryService.create(
					tx,
					input.eventId,
					context.session.user.id,
					input,
				),
			);
		}),

	update: protectedProcedure
		.input(updateInventoryItemSchema.extend({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("inventoryItem", input.id);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}
			return db.$transaction((tx) =>
				InventoryService.update(tx, input.id, input),
			);
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("inventoryItem", input.id);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}
			await InventoryService.delete(db, input.id);
			return { success: true };
		}),

	addMovement: protectedProcedure
		.input(addMovementSchema.extend({ inventoryItemId: z.string() }))
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource(
				"inventoryItem",
				input.inventoryItemId,
			);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}
			return db.$transaction((tx) =>
				InventoryService.addMovement(
					tx,
					input.inventoryItemId,
					context.session.user.id,
					input,
				),
			);
		}),

	getHistory: protectedProcedure
		.input(z.object({ inventoryItemId: z.string() }))
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource(
				"inventoryItem",
				input.inventoryItemId,
			);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}
			return InventoryService.getHistory(db, input.inventoryItemId);
		}),
};
