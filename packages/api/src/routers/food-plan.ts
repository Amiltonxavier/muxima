import db from "@muxima/db";
import type {
	FoodPlanCategory,
	FoodPlanStatus,
	FoodPlanUnit,
} from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { getFoodPlanStats } from "../modules/food-plan/stats";
import { requireEventAccess } from "../shared/auth/event-access";
import { ValidationError } from "../shared/errors/app-error";
import { toJsonInput } from "../shared/utils/json";

/**
 * The food plan holds no prices on purpose: catering, cake and sweets money
 * belongs to the supplier, so the same spend is never counted twice when the
 * budget is aggregated.
 */

const CATEGORY_ENUM = z.enum([
	"STARTER",
	"MAIN_COURSE",
	"SIDE_DISH",
	"DESSERT",
	"FRUIT",
	"OTHER",
] as [string, ...string[]]);

const UNIT_ENUM = z.enum([
	"UNIT",
	"PLATE",
	"BOWL",
	"PORTION",
	"GRAM",
	"KILOGRAM",
	"LITER",
	"GLASS",
	"BOTTLE",
	"PACKAGE",
	"OTHER",
] as [string, ...string[]]);

const STATUS_ENUM = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"] as [
	string,
	...string[],
]);

const quantityInput = z.coerce.number().positive().max(1_000_000);

const eventInput = z.object({ eventId: z.string() });

const itemInput = z.object({
	name: z.string().trim().min(1),
	category: CATEGORY_ENUM,
	quantity: quantityInput.default(1),
	unit: UNIT_ENUM.default("PORTION"),
	description: z.string().trim().optional(),
	notes: z.string().trim().optional(),
	status: STATUS_ENUM.optional(),
	customFields: z.record(z.string(), z.unknown()).optional(),
});

export const foodPlanRouter = {
	/**
	 * Returns the plan of the event, creating an empty one on first access so
	 * the client never has to special-case "not created yet".
	 */
	get: protectedProcedure
		.input(eventInput)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const plan = await db.foodPlan.upsert({
				where: { eventId: input.eventId },
				create: { eventId: input.eventId },
				update: {},
				include: {
					supplier: {
						select: { id: true, name: true, category: true, status: true },
					},
					items: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
				},
			});

			return {
				...plan,
				items: plan.items.map((item) => ({
					...item,
					quantity: Number(item.quantity),
				})),
			};
		}),

	/**
	 * Attaches the single catering supplier. A second, different supplier is
	 * rejected: the plan supports one supplier only.
	 */
	setSupplier: protectedProcedure
		.input(eventInput.extend({ supplierId: z.string().nullable() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			if (input.supplierId) {
				const supplier = await db.supplier.findUnique({
					where: { id: input.supplierId },
					select: { id: true, eventId: true, name: true },
				});
				if (!supplier || supplier.eventId !== input.eventId) {
					throw new ValidationError("Fornecedor inválido para este evento.");
				}

				const existing = await db.foodPlan.findUnique({
					where: { eventId: input.eventId },
					select: { supplierId: true },
				});
				if (existing?.supplierId && existing.supplierId !== input.supplierId) {
					throw new ValidationError(
						"Este plano de alimentação já tem um fornecedor associado. Só é possível contratar um fornecedor uma única vez.",
					);
				}
			}

			return db.foodPlan.upsert({
				where: { eventId: input.eventId },
				create: { eventId: input.eventId, supplierId: input.supplierId },
				update: { supplierId: input.supplierId },
				include: { supplier: true },
			});
		}),

	updateNotes: protectedProcedure
		.input(eventInput.extend({ notes: z.string().trim().optional() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return db.foodPlan.upsert({
				where: { eventId: input.eventId },
				create: { eventId: input.eventId, notes: input.notes },
				update: { notes: input.notes },
			});
		}),

	// ── Items ─────────────────────────────────────────────────────

	addItem: protectedProcedure
		.input(eventInput.extend(itemInput.shape))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			return db.$transaction(async (tx) => {
				const plan = await tx.foodPlan.upsert({
					where: { eventId: input.eventId },
					create: { eventId: input.eventId },
					update: {},
					select: { id: true },
				});
				const last = await tx.foodPlanItem.findFirst({
					where: { foodPlanId: plan.id },
					orderBy: { position: "desc" },
					select: { position: true },
				});

				const item = await tx.foodPlanItem.create({
					data: {
						eventId: input.eventId,
						foodPlanId: plan.id,
						name: input.name,
						category: input.category as FoodPlanCategory,
						quantity: input.quantity,
						unit: input.unit as FoodPlanUnit,
						description: input.description || null,
						notes: input.notes || null,
						status: (input.status ?? "PENDING") as FoodPlanStatus,
						customFields: toJsonInput(input.customFields),
						position: (last?.position ?? 0) + 1,
					},
				});
				return { ...item, quantity: Number(item.quantity) };
			});
		}),

	updateItem: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				eventId: z.string(),
				name: z.string().trim().min(1).optional(),
				category: CATEGORY_ENUM.optional(),
				quantity: quantityInput.optional(),
				unit: UNIT_ENUM.optional(),
				description: z.string().trim().nullable().optional(),
				notes: z.string().trim().nullable().optional(),
				status: STATUS_ENUM.optional(),
				customFields: z.record(z.string(), z.unknown()).optional(),
				position: z.number().int().min(0).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const existing = await db.foodPlanItem.findUnique({
				where: { id: input.id },
				select: { eventId: true },
			});
			if (!existing || existing.eventId !== input.eventId) {
				throw new ValidationError("Item do plano de alimentação inválido.");
			}

			const item = await db.foodPlanItem.update({
				where: { id: input.id },
				data: {
					name: input.name,
					category: input.category as FoodPlanCategory | undefined,
					quantity: input.quantity,
					unit: input.unit as FoodPlanUnit | undefined,
					description:
						input.description === undefined
							? undefined
							: input.description || null,
					notes: input.notes === undefined ? undefined : input.notes || null,
					status: input.status as FoodPlanStatus | undefined,
					customFields: toJsonInput(input.customFields),
					position: input.position,
				},
			});
			return { ...item, quantity: Number(item.quantity) };
		}),

	deleteItem: protectedProcedure
		.input(z.object({ id: z.string(), eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const existing = await db.foodPlanItem.findUnique({
				where: { id: input.id },
				select: { eventId: true },
			});
			if (!existing || existing.eventId !== input.eventId) {
				throw new ValidationError("Item do plano de alimentação inválido.");
			}

			await db.foodPlanItem.delete({ where: { id: input.id } });
			return { success: true };
		}),

	/** Counts, quantities and completion, all derived on the server. */
	getStats: protectedProcedure
		.input(eventInput)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return getFoodPlanStats(input.eventId);
		}),
};

export type {
	FoodPlanCategoryBreakdown,
	FoodPlanStats,
} from "../modules/food-plan/stats";
export { getFoodPlanStats };
