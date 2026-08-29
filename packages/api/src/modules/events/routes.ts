import type { FastifyInstance } from "fastify";
import { successResponse } from "../../shared/http/response";
import { createEventSchema, eventIdSchema, updateEventSchema } from "./schemas";
import { EventService } from "./service";

export async function eventRoutes(app: FastifyInstance) {
	// List events
	app.get("/api/v1/events", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

		const events = await EventService.findByUserId(userId);
		return successResponse(events);
	});

	// Get event by ID
	app.get("/api/v1/events/:eventId", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

		const { eventId } = eventIdSchema.parse(request.params);
		const event = await EventService.findById(eventId, userId);
		return successResponse(event);
	});

	// Create event
	app.post("/api/v1/events", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

		const data = createEventSchema.parse(request.body);
		const event = await EventService.create(userId, data);
		return reply.status(201).send(successResponse(event));
	});

	// Update event
	app.patch("/api/v1/events/:eventId", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

		const { eventId } = eventIdSchema.parse(request.params);
		const data = updateEventSchema.parse(request.body);
		const event = await EventService.update(eventId, userId, data);
		return successResponse(event);
	});

	// Delete event
	app.delete("/api/v1/events/:eventId", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

		const { eventId } = eventIdSchema.parse(request.params);
		await EventService.delete(eventId, userId);
		return reply.status(204).send();
	});
}
