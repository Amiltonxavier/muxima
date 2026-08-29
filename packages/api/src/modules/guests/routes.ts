import type { FastifyInstance } from "fastify";
import { successResponse } from "../../shared/http/response";
import {
	assignTableSchema,
	createGuestSchema,
	createTableSchema,
	updateGuestSchema,
} from "./schemas";
import { GuestService } from "./service";

export async function guestRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/guests", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const guests = await GuestService.findByEventId(eventId);
		return successResponse(guests);
	});

	app.post("/api/v1/events/:eventId/guests", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const data = createGuestSchema.parse(request.body);
		const guest = await GuestService.create(eventId, data);
		return reply.status(201).send(successResponse(guest));
	});

	app.patch("/api/v1/guests/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const data = updateGuestSchema.parse(request.body);
		const guest = await GuestService.update(id, data);
		return successResponse(guest);
	});

	app.delete("/api/v1/guests/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		await GuestService.delete(id);
		return reply.status(204).send();
	});

	app.get("/api/v1/events/:eventId/tables", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const tables = await GuestService.getTables(eventId);
		return successResponse(tables);
	});

	app.post("/api/v1/events/:eventId/tables", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const data = createTableSchema.parse(request.body);
		const table = await GuestService.createTable(eventId, data);
		return reply.status(201).send(successResponse(table));
	});

	app.post("/api/v1/tables/:tableId/guests", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { tableId } = request.params as { tableId: string };
		const { guestId } = assignTableSchema.parse(request.body);
		await GuestService.assignToTable(tableId, guestId);
		return reply.status(201).send(successResponse({ success: true }));
	});

	app.delete(
		"/api/v1/tables/:tableId/guests/:guestId",
		async (request, reply) => {
			const userId = request.session?.user?.id;
			if (!userId)
				return reply
					.status(401)
					.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
			const { tableId, guestId } = request.params as {
				tableId: string;
				guestId: string;
			};
			await GuestService.removeFromTable(tableId, guestId);
			return reply.status(204).send();
		},
	);
}
