import { z } from "zod";

export const guestSchema = z.object({
	name: z.string().min(1, "Nome do convidado é obrigatório"),
	phone: z.string().optional(),
	email: z.string().email("Email inválido").optional().or(z.literal("")),
	group: z.string().optional(),
	type: z.enum(["FAMILY", "FRIEND", "COLLEAGUE", "VIP", "OTHER"]).optional(),
	companionsLimit: z
		.number()
		.int()
		.min(0, "Número de acompanhantes não pode ser negativo")
		.optional()
		.default(0),
	notes: z.string().optional(),
	status: z.enum(["PENDING", "CONFIRMED", "DECLINED", "WAITING"]).optional(),
	tableId: z.string().optional(),
});

export type GuestInput = z.infer<typeof guestSchema>;

export const guestCompanionSchema = z.object({
	name: z.string().min(1, "Nome do acompanhante é obrigatório"),
	status: z.enum(["PENDING", "CONFIRMED", "DECLINED"]).optional(),
});

export type GuestCompanionInput = z.infer<typeof guestCompanionSchema>;

export const tableSchema = z.object({
	name: z.string().min(1, "Nome da mesa é obrigatório"),
	number: z.number().int().positive().optional(),
	capacity: z.number().int().positive("Capacidade deve ser maior que zero"),
	location: z.string().optional(),
	notes: z.string().optional(),
});

export type TableInput = z.infer<typeof tableSchema>;
