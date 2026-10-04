import type { FastifyInstance } from "fastify";
import { requireSessionUserId } from "../../shared/auth/auth-middleware";
import {
	getEventIdForResource,
	requireEventAccess,
	requireEventMutable,
} from "../../shared/auth/event-access";
import { NotFoundError } from "../../shared/errors/app-error";
import { SCHEDULE_CODES, TASK_CODES } from "../../shared/errors/codes";
import { listResponse, successResponse } from "../../shared/http/response";
import { getPaginationMeta, parsePagination } from "../../shared/utils/helpers";
import {
	VALID_SCHEDULE_STATUSES,
	VALID_TASK_CATEGORIES,
	VALID_TASK_PRIORITIES,
	VALID_TASK_STATUSES,
	validateEnum,
} from "../../shared/utils/validate-enum";
import {
	createScheduleSchema,
	createTaskSchema,
	updateScheduleSchema,
	updateTaskSchema,
} from "./schemas";
import { TaskService } from "./service";

export async function taskRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/tasks", async (request) => {
		const userId = requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventAccess(userId, eventId);
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
			status: validateEnum(query.status, VALID_TASK_STATUSES, "status"),
			category: validateEnum(query.category, VALID_TASK_CATEGORIES, "category"),
			priority: validateEnum(query.priority, VALID_TASK_PRIORITIES, "priority"),
		};
		const result = await TaskService.findByEventId(
			eventId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
	});

	app.post("/api/v1/events/:eventId/tasks", async (request, reply) => {
		const userId = requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventMutable(userId, eventId);
		const data = createTaskSchema.parse(request.body);
		const task = await TaskService.create(eventId, userId, data);
		return reply.status(201).send(successResponse(task));
	});

	app.patch("/api/v1/tasks/:id", async (request) => {
		const userId = requireSessionUserId(request);
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("task", id);
		if (!eventId)
			throw new NotFoundError("Tarefa não encontrada", {
				code: TASK_CODES.NOT_FOUND,
			});
		await requireEventMutable(userId, eventId);
		const data = updateTaskSchema.parse(request.body);
		const task = await TaskService.update(id, data);
		return successResponse(task);
	});

	app.delete("/api/v1/tasks/:id", async (request, reply) => {
		const userId = requireSessionUserId(request);
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("task", id);
		if (!eventId)
			throw new NotFoundError("Tarefa não encontrada", {
				code: TASK_CODES.NOT_FOUND,
			});
		await requireEventMutable(userId, eventId);
		await TaskService.delete(id);
		return reply.status(204).send();
	});

	app.get("/api/v1/events/:eventId/schedules", async (request) => {
		const userId = requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventAccess(userId, eventId);
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
			status: validateEnum(query.status, VALID_SCHEDULE_STATUSES, "status"),
		};
		const result = await TaskService.getSchedules(
			eventId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
	});

	app.post("/api/v1/events/:eventId/schedules", async (request, reply) => {
		const userId = requireSessionUserId(request);
		const { eventId } = request.params as { eventId: string };
		await requireEventMutable(userId, eventId);
		const data = createScheduleSchema.parse(request.body);
		const schedule = await TaskService.createSchedule(eventId, data);
		return reply.status(201).send(successResponse(schedule));
	});

	app.patch("/api/v1/schedules/:id", async (request) => {
		const userId = requireSessionUserId(request);
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("schedule", id);
		if (!eventId)
			throw new NotFoundError("Agendamento não encontrado", {
				code: SCHEDULE_CODES.NOT_FOUND,
			});
		await requireEventMutable(userId, eventId);
		const data = updateScheduleSchema.parse(request.body);
		const schedule = await TaskService.updateSchedule(id, data);
		return successResponse(schedule);
	});

	app.delete("/api/v1/schedules/:id", async (request, reply) => {
		const userId = requireSessionUserId(request);
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("schedule", id);
		if (!eventId)
			throw new NotFoundError("Agendamento não encontrado", {
				code: SCHEDULE_CODES.NOT_FOUND,
			});
		await requireEventMutable(userId, eventId);
		await TaskService.deleteSchedule(id);
		return reply.status(204).send();
	});
}
