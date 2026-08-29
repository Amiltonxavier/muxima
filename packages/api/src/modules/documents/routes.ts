import type { FastifyInstance } from "fastify";
import { successResponse } from "../../shared/http/response";
import { createDocumentSchema, updateDocumentSchema } from "./schemas";
import { DocumentService } from "./service";

export async function documentRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/documents", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const documents = await DocumentService.findByEventId(eventId);
		return successResponse(documents);
	});

	app.post("/api/v1/events/:eventId/documents", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const data = createDocumentSchema.parse(request.body);
		const doc = await DocumentService.create(eventId, userId, data);
		return reply.status(201).send(successResponse(doc));
	});

	app.patch("/api/v1/documents/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const data = updateDocumentSchema.parse(request.body);
		const doc = await DocumentService.update(id, data);
		return successResponse(doc);
	});

	app.delete("/api/v1/documents/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		await DocumentService.delete(id);
		return reply.status(204).send();
	});
}
