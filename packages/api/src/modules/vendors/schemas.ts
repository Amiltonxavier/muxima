import { z } from "zod";

export const createVendorSchema = z.object({
	name: z.string().min(1),
	category: z.enum([
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
	]),
	phone: z.string().optional(),
	email: z.string().email().optional(),
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

export const updateVendorSchema = createVendorSchema.partial();
