import { z } from "zod";

/**
 * Mirrors the API contract (`createInventoryItemSchema` / `addMovementSchema`).
 * The categories, units, statuses and movement types are owned by the backend;
 * these enums only exist so the form can render typed selects.
 */
export const INVENTORY_CATEGORY_VALUES = [
	"DRINK",
	"MATERIAL",
	"EQUIPMENT",
	"FURNITURE",
	"LINEN",
	"OTHER",
] as const;

export const INVENTORY_UNIT_VALUES = [
	"UNIT",
	"BOX",
	"CASE",
	"BOTTLE",
	"KG",
	"LITER",
	"PACKAGE",
	"OTHER",
] as const;

export const INVENTORY_STATUS_VALUES = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
] as const;

export const INVENTORY_MOVEMENT_TYPE_VALUES = [
	"PURCHASE",
	"ADD",
	"CONSUMPTION",
	"ADJUSTMENT",
	"LOSS",
	"RETURN",
] as const;

export type InventoryCategoryValue = (typeof INVENTORY_CATEGORY_VALUES)[number];
export type InventoryUnitValue = (typeof INVENTORY_UNIT_VALUES)[number];
export type InventoryStatusValue = (typeof INVENTORY_STATUS_VALUES)[number];

export const inventoryItemSchema = z.object({
	name: z.string().min(1, "Nome do item é obrigatório"),
	category: z.enum(INVENTORY_CATEGORY_VALUES, {
		message: "Categoria é obrigatória",
	}),
	plannedQuantity: z
		.number()
		.positive("Quantidade planeada deve ser maior que zero"),
	currentQuantity: z
		.number()
		.min(0, "A quantidade não pode ser negativa")
		.optional()
		.default(0),
	unit: z.enum(INVENTORY_UNIT_VALUES, {
		message: "Unidade é obrigatória",
	}),
	unitPrice: z.number().min(0).optional(),
	notes: z.string().optional(),
	customFields: z.record(z.string(), z.unknown()).optional(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

export const inventoryItemUpdateSchema = inventoryItemSchema.partial().extend({
	id: z.string(),
	currentQuantity: z.number().min(0).optional(),
});

export type InventoryItemUpdateInput = z.infer<
	typeof inventoryItemUpdateSchema
>;

export const addQuantitySchema = z.object({
	quantity: z.number().positive("A quantidade deve ser maior que zero"),
	unitPrice: z.number().min(0).optional(),
	reason: z.string().optional(),
});

export type AddQuantityInput = z.infer<typeof addQuantitySchema>;

export const inventoryMovementSchema = z.object({
	type: z.enum(INVENTORY_MOVEMENT_TYPE_VALUES, {
		message: "Tipo de movimento é obrigatório",
	}),
	quantity: z.number().positive("A quantidade deve ser maior que zero"),
	unitPrice: z.number().min(0).optional(),
	reason: z.string().optional(),
});

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
