import { z } from "zod";

export const vendorSchema = z.object({
	name: z.string().min(1, "Nome do fornecedor é obrigatório"),
	category: z.enum(
		[
			"VENUE",
			"DECORATION",
			"MUSIC",
			"PHOTOGRAPHY",
			"VIDEO",
			"CATERING",
			"CAKE",
			"DRINKS",
			"TRANSPORT",
			"BEAUTY",
			"SECURITY",
			"ENTERTAINMENT",
			"OTHER",
		],
		{
			message: "Categoria é obrigatória",
		},
	),
	phone: z.string().optional(),
	email: z.string().email("Email inválido").optional().or(z.literal("")),
	address: z.string().optional(),
	description: z.string().optional(),
	notes: z.string().optional(),
	status: z
		.enum([
			"PROSPECT",
			"CONTACTED",
			"NEGOTIATING",
			"CONTRACTED",
			"COMPLETED",
			"CANCELLED",
		])
		.optional(),
});

export type VendorInput = z.infer<typeof vendorSchema>;

export const vendorContractSchema = z.object({
	number: z.string().optional(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	amount: z.number().positive().optional(),
	status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
	notes: z.string().optional(),
});

export type VendorContractInput = z.infer<typeof vendorContractSchema>;
