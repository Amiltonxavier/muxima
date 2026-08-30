import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";

export const inventoryRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const items = await db.inventoryItem.findMany({
				where: { eventId: input.eventId },
				include: {
					vendor: true,
					movements: {
						orderBy: {
							createdAt: "desc",
						},
						take: 5,
					},
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			return items;
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const item = await db.inventoryItem.findUnique({
				where: { id: input.id },
				include: {
					vendor: true,
					movements: {
						orderBy: {
							createdAt: "desc",
						},
					},
				},
			});

			if (!item) {
				throw new Error("Item não encontrado");
			}

			await requireEventAccess(context.session.user.id, item.eventId);

			return item;
		}),

	create: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				name: z.string().min(1),
				category: z.enum(["DRINK", "FOOD", "CAKE", "DECORATION", "OTHER"]),
				plannedQuantity: z.number().min(0),
				currentQuantity: z.number().min(0).optional().default(0),
				unit: z.enum([
					"UNIT",
					"BOX",
					"CASE",
					"BOTTLE",
					"KG",
					"LITER",
					"PACKAGE",
					"OTHER",
				]),
				unitPrice: z.number().min(0).optional(),
				vendorId: z.string().optional(),
				notes: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const item = await db.inventoryItem.create({
				data: {
					eventId: input.eventId,
					name: input.name,
					category: input.category,
					plannedQuantity: input.plannedQuantity,
					currentQuantity: input.currentQuantity,
					unit: input.unit,
					unitPrice: input.unitPrice,
					vendorId: input.vendorId,
					notes: input.notes,
				},
			});

			if (input.currentQuantity && input.currentQuantity > 0) {
				await db.inventoryMovement.create({
					data: {
						inventoryItemId: item.id,
						type: "ADD",
						quantity: input.currentQuantity,
						reason: "Estoque inicial",
						createdBy: context.session.user.id,
					},
				});
			}

			return item;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				category: z
					.enum(["DRINK", "FOOD", "CAKE", "DECORATION", "OTHER"])
					.optional(),
				plannedQuantity: z.number().min(0).optional(),
				unit: z
					.enum([
						"UNIT",
						"BOX",
						"CASE",
						"BOTTLE",
						"KG",
						"LITER",
						"PACKAGE",
						"OTHER",
					])
					.optional(),
				unitPrice: z.number().min(0).optional(),
				vendorId: z.string().optional(),
				notes: z.string().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const item = await db.inventoryItem.update({
				where: { id: input.id },
				data: {
					name: input.name,
					category: input.category,
					plannedQuantity: input.plannedQuantity,
					unit: input.unit,
					unitPrice: input.unitPrice,
					vendorId: input.vendorId,
					notes: input.notes,
				},
			});

			return item;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("inventoryItem", input.id);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}
			await db.inventoryItem.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	addMovement: protectedProcedure
		.input(
			z.object({
				inventoryItemId: z.string(),
				type: z.enum([
					"PURCHASE",
					"ADD",
					"CONSUMPTION",
					"ADJUSTMENT",
					"LOSS",
					"RETURN",
				]),
				quantity: z.number().positive(),
				reason: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const item = await db.inventoryItem.findUnique({
				where: { id: input.inventoryItemId },
			});

			if (!item) {
				throw new Error("Item não encontrado");
			}

			const movement = await db.inventoryMovement.create({
				data: {
					inventoryItemId: input.inventoryItemId,
					type: input.type,
					quantity: input.quantity,
					reason: input.reason,
					createdBy: context.session.user.id,
				},
			});

			let newQuantity = item.currentQuantity.toNumber();
			if (
				input.type === "PURCHASE" ||
				input.type === "ADD" ||
				input.type === "RETURN"
			) {
				newQuantity += input.quantity;
			} else if (input.type === "CONSUMPTION" || input.type === "LOSS") {
				newQuantity -= input.quantity;
			} else if (input.type === "ADJUSTMENT") {
				newQuantity = input.quantity;
			}

			await db.inventoryItem.update({
				where: { id: input.inventoryItemId },
				data: { currentQuantity: Math.max(0, newQuantity) },
			});

			return movement;
		}),
};
