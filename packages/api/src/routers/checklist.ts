import db from "@muxima/db";
import type { ChecklistStatus, Prisma } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	resolveInventoryChecklistStatus,
	resolveSupplierChecklistStatus,
} from "../modules/checklist/rules";
import { getFoodPlanStats } from "../modules/food-plan/stats";
import { requireEventAccess } from "../shared/auth/event-access";
import { ValidationError } from "../shared/errors/app-error";
import { toCents } from "../shared/finance/money";
import {
	isOverdue,
	resolveSupplierMoney,
} from "../shared/finance/supplier-money";

/**
 * Checklist lives on the event and can be linked to a supplier or an inventory
 * item. Linked items are maintained by the API: the rules below are the only
 * place that turns supplier/inventory state into checklist state, and they run
 * inside the write that caused the change, so a page refresh is never required.
 */

const STATUS_ENUM = z.enum([
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
] as [string, ...string[]]);

const eventInput = z.object({ eventId: z.string() });

// ── The auto-completion rules ───────────────────────────────────

/**
 * Re-evaluates every checklist item linked to a supplier. Called after any
 * write that can change a supplier's status or its money.
 */
export async function syncChecklistForSupplier(
	tx: Prisma.TransactionClient,
	supplierId: string,
	now = new Date(),
) {
	const supplier = await tx.supplier.findUnique({
		where: { id: supplierId },
		select: {
			id: true,
			status: true,
			price: true,
			payments: { select: { amount: true, paymentDate: true } },
			installments: {
				select: { amount: true, dueDate: true, status: true, paidAt: true },
			},
		},
	});
	if (!supplier) return;

	const price = toCents(supplier.price);
	const money = resolveSupplierMoney({
		price,
		payments: supplier.payments.map((p) => ({
			amount: toCents(p.amount),
			paymentDate: p.paymentDate,
		})),
		installments: supplier.installments.map((i) => ({
			amount: toCents(i.amount),
			dueDate: i.dueDate,
			status: i.status,
			paidAt: i.paidAt,
		})),
		now,
	});

	const status = resolveSupplierChecklistStatus({
		supplierStatus: supplier.status,
		price,
		paid: money.paid,
	});

	await applyStatus(tx, { supplierId }, status, now);
}

/** Re-evaluates every checklist item linked to an inventory item. */
export async function syncChecklistForInventoryItem(
	tx: Prisma.TransactionClient,
	inventoryItemId: string,
	now = new Date(),
) {
	const item = await tx.inventoryItem.findUnique({
		where: { id: inventoryItemId },
		select: {
			id: true,
			status: true,
			plannedQuantity: true,
			currentQuantity: true,
		},
	});
	if (!item) return;

	const status = resolveInventoryChecklistStatus({
		itemStatus: item.status,
		plannedQuantity: Number(item.plannedQuantity),
		currentQuantity: Number(item.currentQuantity),
	});

	await applyStatus(tx, { inventoryItemId: item.id }, status, now);
}

async function applyStatus(
	tx: Prisma.TransactionClient,
	target: { supplierId?: string; inventoryItemId?: string },
	status: ChecklistStatus,
	now: Date,
) {
	const where: Prisma.ChecklistItemWhereInput = {
		autoManaged: true,
		...(target.supplierId
			? { supplierId: target.supplierId }
			: { inventoryItemId: target.inventoryItemId ?? undefined }),
	};

	const items = await tx.checklistItem.findMany({
		where,
		select: { id: true },
	});
	if (items.length === 0) return;

	await tx.checklistItem.updateMany({
		where: { id: { in: items.map((i) => i.id) } },
		data: {
			status,
			completedAt: status === "COMPLETED" ? now : null,
		},
	});
}

/**
 * Recomputes every auto-managed item of an event. Used after bulk operations
 * and by the seeds/tests to reach a consistent state in one call.
 */
export async function syncEventChecklist(
	tx: Prisma.TransactionClient,
	eventId: string,
	now = new Date(),
) {
	const [suppliers, items] = await Promise.all([
		tx.supplier.findMany({
			where: { eventId },
			select: { id: true },
		}),
		tx.inventoryItem.findMany({
			where: { eventId },
			select: { id: true },
		}),
	]);

	for (const supplier of suppliers) {
		await syncChecklistForSupplier(tx, supplier.id, now);
	}
	for (const item of items) {
		await syncChecklistForInventoryItem(tx, item.id, now);
	}
}

// ── Router ──────────────────────────────────────────────────────

export const checklistRouter = {
	list: protectedProcedure
		.input(eventInput.extend({ status: STATUS_ENUM.optional() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			return db.checklistItem.findMany({
				where: {
					eventId: input.eventId,
					...(input.status ? { status: input.status as ChecklistStatus } : {}),
				},
				include: {
					supplier: {
						select: {
							id: true,
							name: true,
							category: true,
							status: true,
							paymentStatus: true,
						},
					},
					inventoryItem: {
						select: {
							id: true,
							name: true,
							status: true,
							plannedQuantity: true,
							currentQuantity: true,
						},
					},
				},
				orderBy: [{ position: "asc" }, { createdAt: "asc" }],
			});
		}),

	create: protectedProcedure
		.input(
			eventInput.extend({
				title: z.string().trim().min(1),
				description: z.string().trim().optional(),
				dueDate: z.coerce.date().optional(),
				supplierId: z.string().optional(),
				inventoryItemId: z.string().optional(),
				position: z.number().int().min(0).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			// The two links are mutually exclusive: a checklist item tracks either
			// a supplier or an inventory item, never both.
			if (input.supplierId && input.inventoryItemId) {
				throw new ValidationError(
					"Um item de checklist pode estar associado a um fornecedor ou a um item de inventário, não a ambos.",
				);
			}

			return db.$transaction(async (tx) => {
				if (input.supplierId) {
					const supplier = await tx.supplier.findUnique({
						where: { id: input.supplierId },
						select: { eventId: true },
					});
					if (!supplier || supplier.eventId !== input.eventId) {
						throw new ValidationError("Fornecedor inválido para este evento.");
					}
				}
				if (input.inventoryItemId) {
					const item = await tx.inventoryItem.findUnique({
						where: { id: input.inventoryItemId },
						select: { eventId: true },
					});
					if (!item || item.eventId !== input.eventId) {
						throw new ValidationError(
							"Item de inventário inválido para este evento.",
						);
					}
				}

				const last = await tx.checklistItem.findFirst({
					where: { eventId: input.eventId },
					orderBy: { position: "desc" },
					select: { position: true },
				});

				const created = await tx.checklistItem.create({
					data: {
						eventId: input.eventId,
						title: input.title,
						description: input.description || null,
						dueDate: input.dueDate,
						supplierId: input.supplierId,
						inventoryItemId: input.inventoryItemId,
						autoManaged: Boolean(input.supplierId || input.inventoryItemId),
						position: input.position ?? (last?.position ?? 0) + 1,
					},
				});

				// A linked item inherits the derived status immediately.
				if (input.supplierId) {
					await syncChecklistForSupplier(tx, input.supplierId);
				}
				if (input.inventoryItemId) {
					await syncChecklistForInventoryItem(tx, input.inventoryItemId);
				}

				return tx.checklistItem.findUnique({ where: { id: created.id } });
			});
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				eventId: z.string(),
				title: z.string().trim().min(1).optional(),
				description: z.string().trim().nullable().optional(),
				status: STATUS_ENUM.optional(),
				dueDate: z.coerce.date().nullable().optional(),
				position: z.number().int().min(0).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const existing = await db.checklistItem.findUnique({
				where: { id: input.id },
				select: { eventId: true, autoManaged: true },
			});
			if (!existing || existing.eventId !== input.eventId) {
				throw new ValidationError("Item de checklist inválido.");
			}

			// An auto-managed item's status is owned by the API, so a manual
			// override is refused rather than silently reverted later.
			if (existing.autoManaged && input.status) {
				throw new ValidationError(
					"O estado deste item é gerado automaticamente a partir do fornecedor ou do inventário.",
				);
			}

			await db.checklistItem.update({
				where: { id: input.id },
				data: {
					title: input.title,
					description:
						input.description === undefined
							? undefined
							: input.description || null,
					status: input.status as ChecklistStatus | undefined,
					dueDate: input.dueDate,
					position: input.position,
					// Cleared as well as set, otherwise reopening an item would
					// leave a completedAt that contradicts its status.
					completedAt:
						input.status === undefined
							? undefined
							: input.status === "COMPLETED"
								? new Date()
								: null,
				},
			});

			return db.checklistItem.findUnique({ where: { id: input.id } });
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string(), eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			await db.checklistItem.delete({ where: { id: input.id } });
			return { success: true };
		}),

	/** Re-applies the derived rules to every linked item of the event. */
	sync: protectedProcedure
		.input(eventInput)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			await db.$transaction((tx) => syncEventChecklist(tx, input.eventId));
			return { success: true };
		}),

	getStats: protectedProcedure
		.input(eventInput)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const [items, foodPlan] = await Promise.all([
				db.checklistItem.findMany({
					where: { eventId: input.eventId },
					select: {
						status: true,
						autoManaged: true,
						supplierId: true,
						inventoryItemId: true,
						dueDate: true,
					},
				}),
				getFoodPlanStats(input.eventId),
			]);

			const now = new Date();
			const total = items.length;
			const completed = items.filter((i) => i.status === "COMPLETED").length;

			return {
				total,
				completed,
				pending: items.filter((i) => i.status === "PENDING").length,
				inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
				cancelled: items.filter((i) => i.status === "CANCELLED").length,
				completionPercentage:
					total === 0 ? 0 : Math.round((completed / total) * 100),
				autoManaged: items.filter((i) => i.autoManaged).length,
				linkedToSupplier: items.filter((i) => i.supplierId).length,
				linkedToInventory: items.filter((i) => i.inventoryItemId).length,
				// Same rule as the money modules, never a second implementation.
				overdue: items.filter(
					(i) =>
						i.dueDate !== null &&
						isOverdue(
							i.dueDate,
							i.status === "COMPLETED" || i.status === "CANCELLED",
							now,
						),
				).length,
				foodPlan: {
					totalItems: foodPlan.totalItems,
					completedItems: foodPlan.completedItems,
					completionPercentage: foodPlan.completionPercentage,
				},
			};
		}),
};
