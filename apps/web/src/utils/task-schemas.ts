import { z } from "zod";

export const taskSchema = z.object({
	title: z.string().min(1, "Título da tarefa é obrigatório"),
	description: z.string().optional(),
	category: z.enum(
		[
			"FINANCE",
			"VENUE",
			"GUESTS",
			"FOOD",
			"DRINKS",
			"DECORATION",
			"CEREMONY",
			"DOCUMENTS",
			"CLOTHING",
			"TRANSPORT",
			"OTHER",
		],
		{
			message: "Categoria é obrigatória",
		},
	),
	priority: z
		.enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
		.optional()
		.default("MEDIUM"),
	status: z
		.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
		.optional()
		.default("TODO"),
	assignedTo: z.string().optional(),
	dueDate: z.string().optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;

export const scheduleSchema = z.object({
	title: z.string().min(1, "Título é obrigatório"),
	description: z.string().optional(),
	startAt: z.string().min(1, "Data e hora de início são obrigatórios"),
	endAt: z.string().optional(),
	location: z.string().optional(),
	responsible: z.string().optional(),
	status: z
		.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
		.optional()
		.default("PENDING"),
});

export type ScheduleInput = z.infer<typeof scheduleSchema>;
