import { z } from "zod";

export const createGuestSchema = z.object({
	name: z.string().min(1),
	phone: z.string().optional(),
	email: z.string().email().optional(),
	group: z.string().optional(),
	type: z.enum(["FAMILY", "FRIEND", "COLLEAGUE", "VIP", "OTHER"]),
	companionsLimit: z.number().int().min(0).default(0),
	notes: z.string().optional(),
});

export const updateGuestSchema = createGuestSchema.partial();

export const createTableSchema = z.object({
	name: z.string().min(1),
	capacity: z.number().int().positive(),
	number: z.number().int().optional(),
	location: z.string().optional(),
	notes: z.string().optional(),
});

export const assignTableSchema = z.object({
	guestId: z.string().uuid(),
});
