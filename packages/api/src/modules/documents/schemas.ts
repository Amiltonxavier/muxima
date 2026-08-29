import { z } from "zod";

export const createDocumentSchema = z.object({
	name: z.string().min(1),
	type: z.enum(["CONTRACT", "RECEIPT", "QUOTE", "OTHER"]),
	reference: z.string().optional(),
	vendorId: z.string().uuid().optional(),
	expenseId: z.string().uuid().optional(),
	paymentId: z.string().uuid().optional(),
});

export const updateDocumentSchema = createDocumentSchema.partial();
