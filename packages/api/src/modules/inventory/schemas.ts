import { z } from "zod";

export const createInventoryItemSchema = z.object({
	name: z.string().min(1),
	category: z.enum(["DRINK", "FOOD", "CAKE", "DECORATION", "OTHER"]),
	plannedQuantity: z.number().positive(),
	currentQuantity: z.number().min(0).optional(),
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
	unitPrice: z.number().min(0).optional(),
	vendorId: z.string().uuid().optional(),
	notes: z.string().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const addMovementSchema = z.object({
	type: z.enum([
		"PURCHASE",
		"ADD",
		"CONSUMPTION",
		"ADJUSTMENT",
		"LOSS",
		"RETURN",
	]),
	quantity: z.number().positive(),
	reason: z.string().optional(),
});
