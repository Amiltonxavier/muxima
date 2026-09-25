import db from "@muxima/db";
import type { ExpenseStatus, Prisma } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	createExpenseSchema,
	updateExpenseSchema,
} from "../modules/budget/schemas";
import {
	createExpenseWithInventory,
	updateExpenseWithInventory,
} from "../modules/budget/service";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../shared/auth/event-access";
import { expenseListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

const expenseInventoryItemInclude = {
	inventoryItem: {
		select: {
			id: true,
			name: true,
			category: true,
			unit: true,
			status: true,
			plannedQuantity: true,
			currentQuantity: true,
			venueQuantity: true,
			unitPrice: true,
		},
	},
} as const;

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
		.input(z.object({ eventId: z.string() }).merge(expenseListInput))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const { page, limit, skip } = parsePagination(input);

			const filterConditions: Prisma.ExpenseWhereInput[] = [
				{ eventId: input.eventId },
			];

			if (input.search) {
				filterConditions.push({
					OR: [
						{ description: { contains: input.search, mode: "insensitive" } },
						{ notes: { contains: input.search, mode: "insensitive" } },
					],
				});
			}

			if (input.status) {
				filterConditions.push({ status: input.status });
			}

			if (input.type) {
				filterConditions.push({ type: input.type });
			}

			if (input.vendorId) {
				filterConditions.push({ vendorId: input.vendorId });
			}

			const where: Prisma.ExpenseWhereInput = {
				AND: filterConditions,
			};

			const [expenses, total] = await Promise.all([
				db.expense.findMany({
					where,
					include: {
						vendor: true,
						budgetCategory: true,
						payments: true,
						...expenseInventoryItemInclude,
					},
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.expense.count({ where }),
			]);

			return { data: expenses, meta: getPaginationMeta(total, page, limit) };
		}),

	createExpense: protectedProcedure
		.input(createExpenseSchema.extend({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			return createExpenseWithInventory(
				db,
				input.eventId,
				context.session.user.id,
				input,
			);
		}),

	updateExpense: protectedProcedure
		.input(updateExpenseSchema.extend({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const expense = await db.expense.findUnique({
				where: { id: input.id },
				select: { eventId: true },
			});
			if (!expense) throw new Error("Despesa não encontrada");
			await requireEventAccess(context.session.user.id, expense.eventId);

			return updateExpenseWithInventory(db, context.session.user.id, input);
		}),

	deleteExpense: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const expense = await db.expense.findUnique({ where: { id: input.id } });
			if (!expense) throw new Error("Despesa não encontrada");
			await requireEventAccess(context.session.user.id, expense.eventId);

			await db.expense.delete({ where: { id: input.id } });

			return { success: true };
		}),

	getExpenseById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const expense = await db.expense.findUnique({
				where: { id: input.id },
				include: {
					vendor: true,
					budgetCategory: true,
					payments: true,
					...expenseInventoryItemInclude,
				},
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

	getStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const budget = await db.budget.findUnique({
				where: { eventId: input.eventId },
				select: { plannedAmount: true, reserveAmount: true },
			});

			const expensesAgg = await db.expense.aggregate({
				where: { eventId: input.eventId },
				_sum: { totalAmount: true },
			});

			const paymentsAgg = await db.payment.aggregate({
				where: { expense: { eventId: input.eventId } },
				_sum: { amount: true },
			});

			const plannedAmount = Number(budget?.plannedAmount ?? 0);
			const reserveAmount = Number(budget?.reserveAmount ?? 0);
			const totalSpent = expensesAgg._sum.totalAmount?.toNumber() ?? 0;
			const totalPaid = paymentsAgg._sum.amount?.toNumber() ?? 0;
			const available = plannedAmount - totalSpent;
			const utilizationRate =
				plannedAmount > 0 ? Math.round((totalSpent / plannedAmount) * 100) : 0;
			const paymentRate =
				totalSpent > 0 ? Math.round((totalPaid / totalSpent) * 100) : 0;
			const categoryCount = await db.budgetCategory.count({
				where: { eventId: input.eventId },
			});

			const [expenseCount, paidExpenses, pendingExpenses] = await Promise.all([
				db.expense.count({ where: { eventId: input.eventId } }),
				db.expense.count({
					where: { eventId: input.eventId, status: "PAID" },
				}),
				db.expense.count({
					where: {
						eventId: input.eventId,
						status: { in: ["PLANNED", "PARTIALLY_PAID"] },
					},
				}),
			]);

			return {
				plannedAmount,
				reserveAmount,
				totalSpent,
				totalPaid,
				available: available > 0 ? available : 0,
				utilizationRate,
				paymentRate,
				categoryCount,
				expenseCount,
				paidExpenses,
				pendingExpenses,
			};
		}),

	getExpenseStats: protectedProcedure
		.input(z.object({ expenseId: z.string() }))
		.handler(async ({ context, input }) => {
			const expense = await db.expense.findUnique({
				where: { id: input.expenseId },
				select: { totalAmount: true, eventId: true },
			});

			if (!expense) {
				throw new Error("Despesa não encontrada");
			}

			await requireEventAccess(context.session.user.id, expense.eventId);

			const paymentsAgg = await db.payment.aggregate({
				where: { expenseId: input.expenseId },
				_sum: { amount: true },
				_count: true,
			});

			const totalAmount = expense.totalAmount.toNumber();
			const totalPaid = paymentsAgg._sum.amount?.toNumber() ?? 0;
			const paymentCount = paymentsAgg._count;
			const remaining = totalAmount - totalPaid;
			const paymentRate =
				totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

			return {
				totalAmount,
				totalPaid,
				remaining: remaining > 0 ? remaining : 0,
				paymentRate,
				paymentCount,
			};
		}),
};
