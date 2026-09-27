import { z } from "zod";

const futureDateRefine = (val: string | undefined | null) => {
	if (!val) return true;
	const d = new Date(val);
	d.setHours(0, 0, 0, 0);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return d >= today;
};

export const createEventSchema = z.object({
	name: z.string().min(1, "Nome é obrigatório"),
	type: z.enum(["ENGAGEMENT", "WEDDING"]),
	eventDate: z.string().optional().refine(futureDateRefine, {
		message: "A data do evento não pode ser no passado",
	}),
	startTime: z.string().optional(),
	endTime: z.string().optional(),
	venueName: z.string().optional(),
	address: z.string().optional(),
	province: z.string().optional(),
	municipality: z.string().optional(),
	neighborhood: z.string().optional(),
	reference: z.string().optional(),
	capacity: z.number().int().positive().optional(),
	currency: z.string().default("AOA"),
	description: z.string().optional(),
	budgetAmount: z.number().positive().optional(),
});

export const updateEventSchema = z.object({
	name: z.string().min(1).optional(),
	eventDate: z.string().optional().refine(futureDateRefine, {
		message: "A data do evento não pode ser no passado",
	}),
	startTime: z.string().optional(),
	endTime: z.string().optional(),
	venueName: z.string().optional(),
	address: z.string().optional(),
	province: z.string().optional(),
	municipality: z.string().optional(),
	neighborhood: z.string().optional(),
	reference: z.string().optional(),
	capacity: z.number().int().positive().optional(),
	description: z.string().optional(),
	status: z
		.enum([
			"DRAFT",
			"PLANNING",
			"CONFIRMED",
			"ONGOING",
			"COMPLETED",
			"CANCELLED",
		])
		.optional(),
});

export const eventIdSchema = z.object({
	eventId: z.string().uuid(),
});
