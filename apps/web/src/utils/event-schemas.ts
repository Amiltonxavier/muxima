import { z } from "zod";

export const createEventSchema = z.object({
	type: z.enum(["ENGAGEMENT", "WEDDING"], {
		message: "Tipo de evento é obrigatório",
	}),
	name: z
		.string()
		.min(1, "Nome do evento é obrigatório")
		.min(2, "Nome deve ter pelo menos 2 caracteres"),
	eventDate: z.string().optional(),
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

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z.object({
	name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
	eventDate: z.string().optional(),
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
		.enum(["DRAFT", "PLANNING", "CONFIRMED", "COMPLETED", "CANCELLED"])
		.optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventMemberSchema = z.object({
	email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
	role: z.enum(["PARTNER", "ADMIN", "EDITOR", "VIEWER"], {
		message: "Papel é obrigatório",
	}),
});

export type EventMemberInput = z.infer<typeof eventMemberSchema>;
