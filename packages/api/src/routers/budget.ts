import db from "@muxima/db";
import type { ExpenseStatus } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";

export const budgetRouter = {
	getByEventId: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const [budget, categories] = await Promise.all([
				db.budget.findUnique({
					where: { eventId: input.eventId },
				}),
				db.budgetCategory.findMany({
					where: { eventId: input.eventId },
				}),
			]);

			return { ...budget, categories };
		}),

	upsert: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				plannedAmount: z.number().positive(),
				reserveAmount: z.number().min(0).optional(),
				notes: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const budget = await db.budget.upsert({
				where: { eventId: input.eventId },
				update: {
					plannedAmount: input.plannedAmount,
					reserveAmount: input.reserveAmount,
					notes: input.notes,
				},
				create: {
					eventId: input.eventId,
					plannedAmount: input.plannedAmount,
					reserveAmount: input.reserveAmount,
					notes: input.notes,
				},
			});

			return budget;
		}),

	createCategory: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				name: z.string().min(1),
				description: z.string().optional(),
				plannedAmount: z.number().min(0).default(0),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const category = await db.budgetCategory.create({
				data: {
					eventId: input.eventId,
					name: input.name,
					description: input.description,
					plannedAmount: input.plannedAmount,
				},
			});

			return category;
		}),

	updateCategory: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).optional(),
				description: z.string().optional(),
				plannedAmount: z.number().min(0).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const catEventId = await getEventIdForResource(
				"budgetCategory",
				input.id,
			);
			if (catEventId) {
				await requireEventAccess(context.session.user.id, catEventId);
			}

			const category = await db.budgetCategory.update({
				where: { id: input.id },
				data: {
					name: input.name,
					description: input.description,
					plannedAmount: input.plannedAmount,
				},
			});

			return category;
		}),

	deleteCategory: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const eventId = await getEventIdForResource("budgetCategory", input.id);
			if (eventId) {
				await requireEventAccess(context.session.user.id, eventId);
			}
			await db.budgetCategory.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	getExpenses: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const expenses = await db.expense.findMany({
				where: { eventId: input.eventId },
				include: {
					vendor: true,
					budgetCategory: true,
					payments: true,
					inventoryItem: true,
				},
				orderBy: { createdAt: "desc" },
			});

			return expenses;
		}),

	createExpense: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				budgetCategoryId: z.string().optional(),
				vendorId: z.string().optional(),
				description: z.string().min(1),
				type: z.enum(["EXPENSE", "INCOME"]).optional().default("EXPENSE"),
				totalAmount: z.number().positive(),
				dueDate: z.string().optional(),
				paidPercentage: z.number().min(0).max(100).optional().default(0),
				notes: z.string().optional(),
				// Inventory fields (optional)
				addToInventory: z.boolean().optional().default(false),
				inventoryCategory: z
					.enum(["DRINK", "FOOD", "CAKE", "DECORATION", "OTHER"])
					.optional(),
				inventoryUnit: z
					.enum(["UNIT", "BOX", "CASE", "BOTTLE", "KG", "LITER", "PACKAGE", "OTHER"])
					.optional(),
				inventoryPlannedQuantity: z.number().min(0).optional(),
				inventoryUnitPrice: z.number().min(0).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const paidPercentage = input.paidPercentage ?? 0;
			let status: "PLANNED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED" = "PLANNED";
			if (paidPercentage >= 100) status = "PAID";
			else if (paidPercentage > 0) status = "PARTIALLY_PAID";

			const expense = await db.expense.create({
				data: {
					eventId: input.eventId,
					budgetCategoryId: input.budgetCategoryId,
					vendorId: input.vendorId,
					description: input.description,
					type: input.type as "EXPENSE" | "INCOME",
					totalAmount: input.totalAmount,
					dueDate: input.dueDate ? new Date(input.dueDate) : null,
					status,
					paidPercentage,
					notes: input.notes,
					createdBy: context.session.user.id,
				},
			});

			// Create linked inventory item if requested
			if (
				input.addToInventory &&
				input.inventoryCategory &&
				input.inventoryUnit &&
				input.inventoryPlannedQuantity != null
			) {
				await db.inventoryItem.create({
					data: {
						eventId: input.eventId,
						expenseId: expense.id,
						name: input.description,
						category: input.inventoryCategory,
						unit: input.inventoryUnit,
						plannedQuantity: input.inventoryPlannedQuantity,
						currentQuantity: 0,
						unitPrice: input.inventoryUnitPrice,
						vendorId: input.vendorId,
					},
				});
			}

			return expense;
		}),

	updateExpense: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				description: z.string().min(1).optional(),
				vendorId: z.string().nullable().optional(),
				totalAmount: z.number().positive().optional(),
				dueDate: z.string().optional(),
				notes: z.string().optional(),
				status: z
					.enum(["PLANNED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"])
					.optional(),
				// Inventory fields (optional)
				addToInventory: z.boolean().optional(),
				inventoryCategory: z
					.enum(["DRINK", "FOOD", "CAKE", "DECORATION", "OTHER"])
					.optional(),
				inventoryUnit: z
					.enum(["UNIT", "BOX", "CASE", "BOTTLE", "KG", "LITER", "PACKAGE", "OTHER"])
					.optional(),
				inventoryPlannedQuantity: z.number().min(0).optional(),
				inventoryUnitPrice: z.number().min(0).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const expense = await db.expense.findUnique({ where: { id: input.id } });
			if (!expense) throw new Error("Despesa não encontrada");
			await requireEventAccess(context.session.user.id, expense.eventId);

			const updated = await db.expense.update({
				where: { id: input.id },
				data: {
					description: input.description,
					vendorId: input.vendorId,
					totalAmount: input.totalAmount,
					dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
					notes: input.notes,
					status: input.status,
				},
			});

			// Handle inventory sync
			const existingInventoryItem = await db.inventoryItem.findUnique({
				where: { expenseId: input.id },
			});

			if (input.addToInventory === true) {
				const inventoryData = {
					name: input.description ?? expense.description,
					category: input.inventoryCategory,
					unit: input.inventoryUnit,
					plannedQuantity: input.inventoryPlannedQuantity,
					unitPrice: input.inventoryUnitPrice,
					vendorId: input.vendorId ?? expense.vendorId,
				};

				if (existingInventoryItem) {
					// Update existing linked inventory item
					await db.inventoryItem.update({
						where: { expenseId: input.id },
						data: inventoryData,
					});
				} else if (
					input.inventoryCategory &&
					input.inventoryUnit &&
					input.inventoryPlannedQuantity != null
				) {
					// Create new linked inventory item
					await db.inventoryItem.create({
						data: {
							eventId: expense.eventId,
							expenseId: expense.id,
							name: input.description ?? expense.description,
							category: input.inventoryCategory,
							unit: input.inventoryUnit,
							plannedQuantity: input.inventoryPlannedQuantity,
							currentQuantity: 0,
							unitPrice: input.inventoryUnitPrice,
							vendorId: input.vendorId ?? expense.vendorId,
						},
					});
				}
			} else if (input.addToInventory === false && existingInventoryItem) {
				// Remove linked inventory item if unchecked
				await db.inventoryItem.delete({
					where: { expenseId: input.id },
				});
			}

			return updated;
		}),

	deleteExpense: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const expense = await db.expense.findUnique({ where: { id: input.id } });
			if (!expense) throw new Error("Despesa não encontrada");
			await requireEventAccess(context.session.user.id, expense.eventId);

			// Delete linked inventory item first (if exists)
			await db.inventoryItem.deleteMany({ where: { expenseId: input.id } });
			await db.expense.delete({ where: { id: input.id } });

			return { success: true };
		}),

	getExpenseById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const expense = await db.expense.findUnique({
				where: { id: input.id },
				include: { vendor: true, budgetCategory: true, payments: true },
			});
			if (!expense) throw new Error("Despesa não encontrada");
			await requireEventAccess(context.session.user.id, expense.eventId);

			return expense;
		}),

	createPayment: protectedProcedure
		.input(
			z.object({
				expenseId: z.string(),
				amount: z.number().positive(),
				paymentDate: z.string(),
				method: z.enum([
					"CASH",
					"BANK_TRANSFER",
					"ATM",
					"CARD",
					"MOBILE_PAYMENT",
					"OTHER",
				]),
				reference: z.string().optional(),
				notes: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const expense = await db.expense.findUnique({
				where: { id: input.expenseId },
			});

			if (!expense) {
				throw new Error("Despesa não encontrada");
			}

			await requireEventAccess(context.session.user.id, expense.eventId);

			const totalPaid = await db.payment.aggregate({
				where: { expenseId: input.expenseId },
				_sum: { amount: true },
			});

			const currentPaid = totalPaid._sum.amount?.toNumber() ?? 0;
			if (currentPaid + input.amount > expense.totalAmount.toNumber()) {
				throw new Error("Valor excede o total da despesa");
			}

			const payment = await db.payment.create({
				data: {
					expenseId: input.expenseId,
					amount: input.amount,
					paymentDate: new Date(input.paymentDate),
					method: input.method,
					reference: input.reference,
					notes: input.notes,
					createdBy: context.session.user.id,
				},
			});

			const newTotalPaid = currentPaid + input.amount;
			let status: ExpenseStatus = "PLANNED";
			if (newTotalPaid >= expense.totalAmount.toNumber()) {
				status = "PAID";
			} else if (newTotalPaid > 0) {
				status = "PARTIALLY_PAID";
			}

			await db.expense.update({
				where: { id: input.expenseId },
				data: { status },
			});

			return payment;
		}),
};
