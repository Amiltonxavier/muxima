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

// Inventory data required when an expense represents an inventory item
// ("É um item do inventário").
export const expenseInventorySchema = z.object({
	name: z.string().min(1, "Nome do produto é obrigatório"),
	category: z.enum(["DRINK", "FOOD", "CAKE", "DECORATION", "OTHER"]),
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
	plannedQuantity: z
		.number()
		.positive("Quantidade planeada deve ser maior que zero"),
	venueQuantity: z.number().min(0).optional(),
	unitPrice: z.number().min(0).optional(),
	notes: z.string().optional(),
});

export type ExpenseInventoryInput = z.infer<typeof expenseInventorySchema>;

export const createExpenseSchema = z
	.object({
		description: z.string().min(1),
		totalAmount: z.number().positive(),
		type: z.enum(["EXPENSE", "INCOME"]).optional(),
		budgetCategoryId: z.string().uuid().optional(),
		vendorId: z.string().uuid().optional(),
		dueDate: z.string().optional(),
		notes: z.string().optional(),
		paidPercentage: z.number().min(0).max(100).optional(),
		isInventoryItem: z.boolean().optional().default(false),
		inventory: expenseInventorySchema.optional(),
	})
	.superRefine((value, ctx) => {
		if (value.isInventoryItem && !value.inventory) {
			ctx.addIssue({
				code: "custom",
				path: ["inventory"],
				message: "Dados de inventário obrigatórios para um item do inventário",
			});
		}
	});

export const updateExpenseSchema = z.object({
	description: z.string().min(1).optional(),
	vendorId: z.string().uuid().nullable().optional(),
	totalAmount: z.number().positive().optional(),
	dueDate: z.string().optional(),
	notes: z.string().optional(),
	status: z
		.enum(["PLANNED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"])
		.optional(),
	isInventoryItem: z.boolean().optional(),
	inventory: expenseInventorySchema.optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

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
