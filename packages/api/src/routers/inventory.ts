import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";
import { parsePagination } from "../shared/utils/helpers";

export const inventoryRouter = {
	list: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				page: z.number().optional(),
				limit: z.number().optional(),
				search: z.string().optional(),
				category: z
					.enum(["DRINK", "FOOD", "CAKE", "DECORATION", "OTHER"])
					.optional(),
				stockStatus: z.enum(["LOW", "OK", "FULL"]).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const { page, limit, skip } = parsePagination(input);

			const where: Record<string, unknown> = {
				eventId: input.eventId,
			};

			if (input.search) {
				where.OR = [
					{ name: { contains: input.search, mode: "insensitive" } },
					{ notes: { contains: input.search, mode: "insensitive" } },
				];
			}

			if (input.category) where.category = input.category;

			// Stock status filtering requires post-processing since it's derived
			// We fetch all matching items and filter in memory for stock status
			const [allItems, total] = await Promise.all([
				db.inventoryItem.findMany({
					where,
					include: {
						vendor: true,
						event: {
							select: { eventDate: true },
						},
						movements: {
							orderBy: { createdAt: "desc" },
							take: 5,
						},
					},
					orderBy: { createdAt: "desc" },
					...(input.stockStatus ? {} : { skip, take: limit }),
				}),
				db.inventoryItem.count({ where }),
			]);

			// Calculate stock status for each item
			const itemsWithStock = allItems.map((item) => {
				const planned = Number(item.plannedQuantity) || 0;
				const current = Number(item.currentQuantity) || 0;
				const stockPercentage =
					planned > 0 ? Math.round((current / planned) * 100) : 100;
				const stockStatus =
					stockPercentage >= 100
						? "FULL"
						: stockPercentage >= 50
							? "OK"
							: "LOW";
				return { ...item, stockPercentage, stockStatus };
			});

			// Apply stock status filter
			let filteredItems = itemsWithStock;
			if (input.stockStatus) {
				filteredItems = itemsWithStock.filter(
					(item) => item.stockStatus === input.stockStatus,
				);
			}

			// Calculate summary stats
			const totalPlanned = allItems.reduce(
				(sum, i) => sum + (Number(i.plannedQuantity) || 0),
				0,
			);
			const totalCurrent = allItems.reduce(
				(sum, i) => sum + (Number(i.currentQuantity) || 0),
				0,
			);
			const totalValue = allItems.reduce(
				(sum, i) =>
					sum + (Number(i.currentQuantity) || 0) * (Number(i.unitPrice) || 0),
				0,
			);
			const lowStockCount = itemsWithStock.filter(
				(i) => i.stockStatus === "LOW",
			).length;
			const drinkItems = allItems.filter((i) => i.category === "DRINK");
			const drinkStats = {
				count: drinkItems.length,
				totalPlanned: drinkItems.reduce(
					(sum, i) => sum + (Number(i.plannedQuantity) || 0),
					0,
				),
				totalCurrent: drinkItems.reduce(
					(sum, i) => sum + (Number(i.currentQuantity) || 0),
					0,
				),
			};

			// Paginate filtered results if stock filter was applied
			if (input.stockStatus) {
				const paginatedItems = filteredItems.slice(skip, skip + limit);
				return {
					data: paginatedItems,
					pagination: {
						page,
						limit,
						total: filteredItems.length,
						totalPages: Math.ceil(filteredItems.length / limit),
						hasNextPage: page * limit < filteredItems.length,
						hasPreviousPage: page > 1,
					},
					stats: {
						totalPlanned,
						totalCurrent,
						totalValue,
						lowStockCount,
						drinkStats,
					},
				};
			}

			return {
				data: filteredItems,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
					hasNextPage: page * limit < total,
					hasPreviousPage: page > 1,
				},
				stats: {
					totalPlanned,
					totalCurrent,
					totalValue,
					lowStockCount,
					drinkStats,
				},
			};
		}),

	stats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const items = await db.inventoryItem.findMany({
				where: { eventId: input.eventId },
				select: {
					id: true,
					name: true,
					unit: true,
					plannedQuantity: true,
					currentQuantity: true,
					unitPrice: true,
					category: true,
				},
			});

			const itemsWithPercentage = items.map((i) => {
				const planned = Number(i.plannedQuantity) || 0;
				const current = Number(i.currentQuantity) || 0;
				const stockPercentage =
					planned > 0 ? Math.round((current / planned) * 100) : 100;
				return { ...i, stockPercentage };
			});

			const totalPlanned = items.reduce(
				(sum, i) => sum + (Number(i.plannedQuantity) || 0),
				0,
			);
			const totalCurrent = items.reduce(
				(sum, i) => sum + (Number(i.currentQuantity) || 0),
				0,
			);
			const totalValue = items.reduce(
				(sum, i) =>
					sum + (Number(i.currentQuantity) || 0) * (Number(i.unitPrice) || 0),
				0,
			);

			const lowStockCount = itemsWithPercentage.filter(
				(i) => i.stockPercentage < 50,
			).length;

			const drinkItems = itemsWithPercentage.filter((i) => i.category === "DRINK");
			const drinkStats = {
				count: drinkItems.length,
				totalPlanned: drinkItems.reduce(
					(sum, i) => sum + (Number(i.plannedQuantity) || 0),
					0,
				),
				totalCurrent: drinkItems.reduce(
					(sum, i) => sum + (Number(i.currentQuantity) || 0),
					0,
				),
				items: drinkItems,
			};

			return {
				stats: {
					totalPlanned,
					totalCurrent,
					totalValue,
					lowStockCount,
					drinkStats,
				},
			};
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const item = await db.inventoryItem.findUnique({
				where: { id: input.id },
				include: {
					vendor: true,
					movements: {
						orderBy: { createdAt: "desc" },
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
				cakeType: z
					.enum([
						"WEDDING_CAKE",
						"GROOM_CAKE",
						"BRIDE_CAKE",
						"GUEST_CAKE",
						"BIRTHDAY_CAKE",
						"CHILDREN_CAKE",
						"OTHER",
					])
					.optional(),
				weight: z.number().min(0).optional(),
				deliveryDate: z.string().optional(),
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
					cakeType: input.cakeType,
					weight: input.weight,
					deliveryDate: input.deliveryDate
						? new Date(input.deliveryDate)
						: null,
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
				cakeType: z
					.enum([
						"WEDDING_CAKE",
						"GROOM_CAKE",
						"BRIDE_CAKE",
						"GUEST_CAKE",
						"BIRTHDAY_CAKE",
						"CHILDREN_CAKE",
						"OTHER",
					])
					.optional(),
				weight: z.number().min(0).optional(),
				deliveryDate: z.string().optional(),
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
					cakeType: input.cakeType,
					weight: input.weight,
					deliveryDate: input.deliveryDate
						? new Date(input.deliveryDate)
						: undefined,
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
