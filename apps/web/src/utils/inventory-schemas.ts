import { z } from "zod";

export const inventoryItemSchema = z
	.object({
		name: z.string().min(1, "Nome do item é obrigatório"),
		category: z.enum(["DRINK", "FOOD", "CAKE", "DECORATION", "OTHER"], {
			message: "Categoria é obrigatória",
		}),
		plannedQuantity: z.number().positive("Quantidade deve ser maior que zero"),
		venueQuantity: z
			.number()
			.min(0, "Quantidade não pode ser negativa")
			.optional()
			.default(0),
		unit: z.enum(
			["UNIT", "BOX", "CASE", "BOTTLE", "KG", "LITER", "PACKAGE", "OTHER"],
			{
				message: "Unidade é obrigatória",
			},
		),
		unitPrice: z.number().min(0).optional(),
		vendorId: z.string().optional(),
		notes: z.string().optional(),
	})
	.superRefine((value, ctx) => {
		if (value.venueQuantity > value.plannedQuantity) {
			ctx.addIssue({
				code: "custom",
				path: ["venueQuantity"],
				message:
					"A quantidade para o salão não pode superar a quantidade planeada",
			});
		}
	});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

export const addQuantitySchema = z.object({
	quantity: z.number().positive("Quantidade deve ser maior que zero"),
	unitPrice: z.number().min(0).optional(),
	reason: z.string().optional(),
});

export type AddQuantityInput = z.infer<typeof addQuantitySchema>;

export const inventoryMovementSchema = z.object({
	type: z.enum(
		["PURCHASE", "ADD", "CONSUMPTION", "ADJUSTMENT", "LOSS", "RETURN"],
		{
			message: "Tipo de movimento é obrigatório",
		},
	),
	quantity: z.number().positive("Quantidade deve ser maior que zero"),
	unitPrice: z.number().min(0).optional(),
	reason: z.string().optional(),
});

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;
