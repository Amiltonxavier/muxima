import { z } from "zod";

export const documentSchema = z.object({
	name: z.string().min(1, "Nome do documento é obrigatório"),
	type: z.enum(["CONTRACT", "RECEIPT", "QUOTE", "OTHER"], {
		message: "Tipo de documento é obrigatório",
	}),
	reference: z.string().optional(),
	vendorId: z.string().optional(),
	expenseId: z.string().optional(),
	paymentId: z.string().optional(),
	status: z
		.enum(["ACTIVE", "ARCHIVED", "DELETED"])
		.optional()
		.default("ACTIVE"),
});

export type DocumentInput = z.infer<typeof documentSchema>;
