import { z } from "zod";

export const INVENTORY_CATEGORIES = [
	"DRINK",
	"MATERIAL",
	"EQUIPMENT",
	"FURNITURE",
	"LINEN",
	"OTHER",
] as const;

export const INVENTORY_UNITS = [
	"UNIT",
	"BOX",
	"CASE",
	"BOTTLE",
	"KG",
	"LITER",
	"PACKAGE",
	"OTHER",
] as const;

export const INVENTORY_STATUSES = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
] as const;

export const MOVEMENT_TYPES = [
	"PURCHASE",
	"ADD",
	"CONSUMPTION",
	"ADJUSTMENT",
	"LOSS",
	"RETURN",
] as const;

const inventoryCoreFields = {
	name: z.string().min(1, "Nome do item é obrigatório"),
	category: z.enum(INVENTORY_CATEGORIES),
	plannedQuantity: z
		.number()
		.positive("Quantidade planeada deve ser maior que zero"),
	unit: z.enum(INVENTORY_UNITS),
	unitPrice: z.number().min(0).optional(),
	notes: z.string().optional(),
	customFields: z.record(z.string(), z.unknown()).optional(),
};

export const createInventoryItemSchema = z
	.object({
		...inventoryCoreFields,
		currentQuantity: z.number().min(0).optional().default(0),
	})
	.superRefine((value, ctx) => {
		if (value.currentQuantity > value.plannedQuantity) {
			ctx.addIssue({
				code: "custom",
				path: ["currentQuantity"],
				message: "A quantidade actual não pode superar a quantidade planeada",
			});
		}
	});

export type CreateInventoryItemInput = z.infer<
	typeof createInventoryItemSchema
>;

export const updateInventoryItemSchema = z
	.object({
		...inventoryCoreFields,
		currentQuantity: z.number().min(0).optional(),
	})
	.partial();

export type UpdateInventoryItemInput = z.infer<
	typeof updateInventoryItemSchema
>;

export const addMovementSchema = z.object({
	type: z.enum(MOVEMENT_TYPES).optional().default("ADD"),
	quantity: z.number().positive("Quantidade deve ser maior que zero"),
	unitPrice: z.number().min(0).optional(),
	reason: z.string().optional(),
});

export type AddMovementInput = z.infer<typeof addMovementSchema>;
