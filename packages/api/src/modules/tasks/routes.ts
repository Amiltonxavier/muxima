import type { FastifyInstance } from "fastify";
import { successResponse } from "../../shared/http/response";
import {
	createScheduleSchema,
	createTaskSchema,
	updateTaskSchema,
} from "./schemas";
import { TaskService } from "./service";

export async function taskRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/tasks", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const tasks = await TaskService.findByEventId(eventId);
		return successResponse(tasks);
	});

	app.post("/api/v1/events/:eventId/tasks", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const data = createTaskSchema.parse(request.body);
		const task = await TaskService.create(eventId, userId, data);
		return reply.status(201).send(successResponse(task));
	});

	app.patch("/api/v1/tasks/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const data = updateTaskSchema.parse(request.body);
		const task = await TaskService.update(id, data);
		return successResponse(task);
	});

	app.delete("/api/v1/tasks/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		await TaskService.delete(id);
		return reply.status(204).send();
	});

	app.get("/api/v1/events/:eventId/schedules", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const schedules = await TaskService.getSchedules(eventId);
		return successResponse(schedules);
	});

	app.post("/api/v1/events/:eventId/schedules", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const data = createScheduleSchema.parse(request.body);
		const schedule = await TaskService.createSchedule(eventId, data);
		return reply.status(201).send(successResponse(schedule));
	});

	app.patch("/api/v1/schedules/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const data = request.body as Record<string, unknown>;
		const schedule = await TaskService.updateSchedule(id, data);
		return successResponse(schedule);
	});

	app.delete("/api/v1/schedules/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		await TaskService.deleteSchedule(id);
		return reply.status(204).send();
	});
}
