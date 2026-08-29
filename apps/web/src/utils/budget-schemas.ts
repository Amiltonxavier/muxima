import { z } from "zod";

export const budgetSchema = z.object({
	plannedAmount: z.number().positive("Valor deve ser maior que zero"),
	reserveAmount: z
		.number()
		.min(0, "Valor de reserva não pode ser negativo")
		.optional()
		.default(0),
	notes: z.string().optional(),
});

export type BudgetInput = z.infer<typeof budgetSchema>;

export const budgetCategorySchema = z.object({
	name: z.string().min(1, "Nome da categoria é obrigatório"),
	description: z.string().optional(),
	plannedAmount: z.number().min(0, "Valor não pode ser negativo").default(0),
});

export type BudgetCategoryInput = z.infer<typeof budgetCategorySchema>;

export const expenseSchema = z.object({
	budgetCategoryId: z.string().optional(),
	vendorId: z.string().optional(),
	description: z.string().min(1, "Descrição é obrigatória"),
	totalAmount: z.number().positive("Valor deve ser maior que zero"),
	dueDate: z.string().optional(),
	notes: z.string().optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const paymentSchema = z.object({
	amount: z.number().positive("Valor deve ser maior que zero"),
	paymentDate: z.string().min(1, "Data de pagamento é obrigatória"),
	method: z.enum(
		["CASH", "BANK_TRANSFER", "ATM", "CARD", "MOBILE_PAYMENT", "OTHER"],
		{
			message: "Método de pagamento é obrigatório",
		},
	),
	reference: z.string().optional(),
	notes: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
