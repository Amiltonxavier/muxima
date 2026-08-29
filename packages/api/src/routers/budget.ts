import db from "@muxima/db";
import type { ExpenseStatus } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const budgetRouter = {
	getByEventId: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ input }) => {
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
		.handler(async ({ input }) => {
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
		.handler(async ({ input }) => {
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
		.handler(async ({ input }) => {
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
		.handler(async ({ input }) => {
			await db.budgetCategory.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	getExpenses: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ input }) => {
			const expenses = await db.expense.findMany({
				where: { eventId: input.eventId },
				include: {
					vendor: true,
					budgetCategory: true,
					payments: true,
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
				totalAmount: z.number().positive(),
				dueDate: z.string().optional(),
				notes: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const expense = await db.expense.create({
				data: {
					eventId: input.eventId,
					budgetCategoryId: input.budgetCategoryId,
					vendorId: input.vendorId,
					description: input.description,
					totalAmount: input.totalAmount,
					dueDate: input.dueDate ? new Date(input.dueDate) : null,
					notes: input.notes,
					createdBy: context.session.user.id,
				},
			});

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
