import { z } from "zod";

/**
 * Mirrors the API contract (`CATEGORY_ENUM` / `STATUS_ENUM` in
 * `packages/api/src/routers/suppliers.ts`). The category-specific fields are
 * not duplicated here: they are fetched from `suppliers.getCategorySchema` so
 * the form and the API validate exactly the same spec.
 */
export const SUPPLIER_CATEGORY_VALUES = [
	"VENUE",
	"DECORATION",
	"FLORIST",
	"CATERING",
	"CAKE",
	"SWEETS_AND_SAVOURIES",
	"PHOTOGRAPHER",
	"VIDEOGRAPHER",
	"DJ",
	"BAND",
	"MUSIC",
	"ENTERTAINMENT",
	"TRANSPORT",
	"BEAUTY",
	"BRIDE_ATTIRE",
	"GROOM_ATTIRE",
	"RINGS",
	"WEDDING_PLANNER",
	"OFFICIANT",
	"FAVOURS",
	"ACCOMMODATION",
	"SECURITY",
	"OTHER",
] as const;

export const SUPPLIER_STATUS_VALUES = [
	"PROSPECT",
	"CONTACTED",
	"NEGOTIATING",
	"CONFIRMED",
	"COMPLETED",
	"CANCELLED",
] as const;

export const SUPPLIER_PAYMENT_METHOD_VALUES = [
	"CASH",
	"BANK_TRANSFER",
	"ATM",
	"CARD",
	"MOBILE_PAYMENT",
	"OTHER",
] as const;

export type SupplierCategory = (typeof SUPPLIER_CATEGORY_VALUES)[number];
export type SupplierStatus = (typeof SUPPLIER_STATUS_VALUES)[number];
export type SupplierPaymentMethod =
	(typeof SUPPLIER_PAYMENT_METHOD_VALUES)[number];

export const supplierSchema = z.object({
	name: z.string().min(1, "Nome do fornecedor é obrigatório"),
	category: z.enum(SUPPLIER_CATEGORY_VALUES, {
		message: "Categoria é obrigatória",
	}),
	price: z.number().min(0, "O valor não pode ser negativo").optional(),
	phone: z.string().trim().optional(),
	email: z.union([z.email("Email inválido"), z.literal("")]).optional(),
	address: z.string().trim().optional(),
	description: z.string().trim().optional(),
	notes: z.string().trim().optional(),
	status: z.enum(SUPPLIER_STATUS_VALUES).optional(),
	customFields: z.record(z.string(), z.unknown()).optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;

export const supplierPaymentSchema = z.object({
	supplierId: z.string(),
	amount: z.number().positive("O valor deve ser maior que zero"),
	paymentDate: z.coerce.date(),
	method: z.enum(SUPPLIER_PAYMENT_METHOD_VALUES),
	reference: z.string().trim().optional(),
	notes: z.string().trim().optional(),
});

export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>;

export const supplierInstallmentSchema = z.object({
	amount: z.number().positive("O valor deve ser maior que zero"),
	dueDate: z.coerce.date(),
	notes: z.string().trim().optional(),
});

export type SupplierInstallmentInput = z.infer<
	typeof supplierInstallmentSchema
>;
