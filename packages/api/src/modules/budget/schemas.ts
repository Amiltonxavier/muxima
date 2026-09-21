import { z } from "zod";

export const upsertBudgetSchema = z.object({
	plannedAmount: z.number().positive(),
	reserveAmount: z.number().min(0).optional(),
	notes: z.string().optional(),
});

export const createCategorySchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	plannedAmount: z.number().min(0).default(0),
});

export const updateCategorySchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	plannedAmount: z.number().min(0).optional(),
});

export const createExpenseSchema = z.object({
	description: z.string().min(1),
	totalAmount: z.number().positive(),
	budgetCategoryId: z.string().uuid().optional(),
	vendorId: z.string().uuid().optional(),
	dueDate: z.string().optional(),
	notes: z.string().optional(),
});

export const createPaymentSchema = z.object({
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
});
