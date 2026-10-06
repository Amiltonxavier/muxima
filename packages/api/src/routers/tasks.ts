import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";
import { PERMISSIONS } from "@muxima/permissions";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	getScheduleAnalytics,
	getTaskAnalytics,
} from "../modules/tasks/analytics";
import {
	requireEventIdForResource,
	requireEventPermission,
	requireEventPermissionMutable,
} from "../shared/auth/authorization";

import { NotFoundError } from "../shared/errors/app-error";
import { TASK_CODES } from "../shared/errors/codes";
import { scheduleListInput, taskListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

export const tasksRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }).merge(taskListInput))
		.handler(async ({ context, input }) => {
			// F-04: without this guard any authenticated user could read any
			// event's tasks by supplying its `eventId`. Event access + the
			// module's read permission, exactly like every other task procedure.
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.TASK_READ,
			);
			const { page, limit, skip } = parsePagination(input);

			const filterConditions: Prisma.TaskWhereInput[] = [
				{ eventId: input.eventId },
			];

			if (input.search) {
				filterConditions.push({
					OR: [
						{ title: { contains: input.search, mode: "insensitive" } },
						{ description: { contains: input.search, mode: "insensitive" } },
					],
				});
			}

			if (input.status) {
				filterConditions.push({ status: input.status });
			}

			if (input.category) {
				filterConditions.push({ category: input.category });
			}

			if (input.priority) {
				filterConditions.push({ priority: input.priority });
			}

			const where: Prisma.TaskWhereInput = {
				AND: filterConditions,
			};

			const [tasks, total] = await Promise.all([
				db.task.findMany({
					where,
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.task.count({ where }),
			]);

			return { data: tasks, meta: getPaginationMeta(total, page, limit) };
		}),

	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const task = await db.task.findUnique({
				where: { id: input.id },
			});

			if (!task) {
				throw new NotFoundError("Tarefa não encontrada", {
					code: TASK_CODES.NOT_FOUND,
				});
			}

			await requireEventPermission(
				context.session.user.id,
				task.eventId,
				PERMISSIONS.TASK_READ,
			);

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
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.TASK_CREATE,
			);

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
			const eventId = await requireEventIdForResource("task", input.id);
			await requireEventPermissionMutable(
				context.session.user.id,
				eventId,
				PERMISSIONS.TASK_UPDATE,
			);

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
		.handler(async ({ context, input }) => {
			const eventId = await requireEventIdForResource("task", input.id);
			await requireEventPermissionMutable(
				context.session.user.id,
				eventId,
				PERMISSIONS.TASK_DELETE,
			);

			await db.task.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	getSchedules: protectedProcedure
		.input(z.object({ eventId: z.string() }).merge(scheduleListInput))
		.handler(async ({ context, input }) => {
			// F-04: same cross-event read as `list` — the schedule of any event
			// was visible to any authenticated caller who knew its id.
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.SCHEDULE_READ,
			);
			const { page, limit, skip } = parsePagination(input);

			const filterConditions: Prisma.ScheduleWhereInput[] = [
				{ eventId: input.eventId },
			];

			if (input.search) {
				filterConditions.push({
					OR: [
						{ title: { contains: input.search, mode: "insensitive" } },
						{ description: { contains: input.search, mode: "insensitive" } },
						{ location: { contains: input.search, mode: "insensitive" } },
						{ responsible: { contains: input.search, mode: "insensitive" } },
					],
				});
			}

			if (input.status) {
				filterConditions.push({ status: input.status });
			}

			const where: Prisma.ScheduleWhereInput = {
				AND: filterConditions,
			};

			const [schedules, total] = await Promise.all([
				db.schedule.findMany({
					where,
					orderBy: { startAt: "asc" },
					skip,
					take: limit,
				}),
				db.schedule.count({ where }),
			]);

			return { data: schedules, meta: getPaginationMeta(total, page, limit) };
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
		.handler(async ({ context, input }) => {
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.SCHEDULE_CREATE,
			);

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
		.handler(async ({ context, input }) => {
			const eventId = await requireEventIdForResource("schedule", input.id);
			await requireEventPermissionMutable(
				context.session.user.id,
				eventId,
				PERMISSIONS.SCHEDULE_UPDATE,
			);

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
		.handler(async ({ context, input }) => {
			const eventId = await requireEventIdForResource("schedule", input.id);
			await requireEventPermissionMutable(
				context.session.user.id,
				eventId,
				PERMISSIONS.SCHEDULE_DELETE,
			);

			await db.schedule.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	getStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.TASK_READ,
			);
			return getTaskAnalytics(db, input.eventId);
		}),

	getScheduleStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.SCHEDULE_READ,
			);
			return getScheduleAnalytics(db, input.eventId);
		}),
};
