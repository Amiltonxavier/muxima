import { z } from "zod";

export const createTaskSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
	category: z.enum([
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
	]),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
	assignedTo: z.string().uuid().optional(),
	dueDate: z.string().optional(),
});

export const updateTaskSchema = z.object({
	title: z.string().min(1).optional(),
	description: z.string().optional(),
	category: z
		.enum([
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
		])
		.optional(),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
	status: z.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
	assignedTo: z.string().uuid().optional(),
	dueDate: z.string().optional(),
});

export const createScheduleSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
	startAt: z.string(),
	endAt: z.string().optional(),
	location: z.string().optional(),
	responsible: z.string().optional(),
});
