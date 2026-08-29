import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const tasksRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ input }) => {
			const tasks = await db.task.findMany({
				where: { eventId: input.eventId },
				orderBy: {
					createdAt: "desc",
				},
			});

			return tasks;
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			const task = await db.task.findUnique({
				where: { id: input.id },
			});

			if (!task) {
				throw new Error("Tarefa não encontrada");
			}

			return task;
		}),

	create: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
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
				priority: z
					.enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
					.optional()
					.default("MEDIUM"),
				assignedTo: z.string().optional(),
				dueDate: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const task = await db.task.create({
				data: {
					eventId: input.eventId,
					title: input.title,
					description: input.description,
					category: input.category,
					priority: input.priority,
					assignedTo: input.assignedTo,
					dueDate: input.dueDate ? new Date(input.dueDate) : null,
					createdBy: context.session.user.id,
				},
			});

			return task;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
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
				status: z
					.enum(["TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
					.optional(),
				assignedTo: z.string().optional(),
				dueDate: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const task = await db.task.update({
				where: { id: input.id },
				data: {
					title: input.title,
					description: input.description,
					category: input.category,
					priority: input.priority,
					status: input.status,
					assignedTo: input.assignedTo,
					dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
					completedAt: input.status === "COMPLETED" ? new Date() : undefined,
					completedBy:
						input.status === "COMPLETED" ? context.session.user.id : undefined,
				},
			});

			return task;
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			await db.task.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	getSchedules: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ input }) => {
			const schedules = await db.schedule.findMany({
				where: { eventId: input.eventId },
				orderBy: {
					startAt: "asc",
				},
			});

			return schedules;
		}),

	createSchedule: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				title: z.string().min(1),
				description: z.string().optional(),
				startAt: z.string(),
				endAt: z.string().optional(),
				location: z.string().optional(),
				responsible: z.string().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const schedule = await db.schedule.create({
				data: {
					eventId: input.eventId,
					title: input.title,
					description: input.description,
					startAt: new Date(input.startAt),
					endAt: input.endAt ? new Date(input.endAt) : null,
					location: input.location,
					responsible: input.responsible,
				},
			});

			return schedule;
		}),

	updateSchedule: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				title: z.string().min(1).optional(),
				description: z.string().optional(),
				startAt: z.string().optional(),
				endAt: z.string().optional(),
				location: z.string().optional(),
				responsible: z.string().optional(),
				status: z
					.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
					.optional(),
			}),
		)
		.handler(async ({ input }) => {
			const schedule = await db.schedule.update({
				where: { id: input.id },
				data: {
					title: input.title,
					description: input.description,
					startAt: input.startAt ? new Date(input.startAt) : undefined,
					endAt: input.endAt ? new Date(input.endAt) : undefined,
					location: input.location,
					responsible: input.responsible,
					status: input.status,
				},
			});

			return schedule;
		}),

	deleteSchedule: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			await db.schedule.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),
};
