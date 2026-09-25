import type { FastifyInstance } from "fastify";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../../shared/auth/event-access";
import { listResponse, successResponse } from "../../shared/http/response";
import { getPaginationMeta, parsePagination } from "../../shared/utils/helpers";
import {
	VALID_DOCUMENT_STATUSES,
	VALID_DOCUMENT_TYPES,
	validateEnum,
} from "../../shared/utils/validate-enum";
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
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
			type: validateEnum(query.type, VALID_DOCUMENT_TYPES),
			status: validateEnum(query.status, VALID_DOCUMENT_STATUSES),
			vendorId: query.vendorId || undefined,
		};
		const result = await DocumentService.findByEventId(
			eventId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
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
		const eventId = await getEventIdForResource("document", id);
		if (!eventId)
			return reply.status(404).send({
				error: { code: "NOT_FOUND", message: "Documento não encontrado" },
			});
		await requireEventAccess(userId, eventId);
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
		const eventId = await getEventIdForResource("document", id);
		if (!eventId)
			return reply.status(404).send({
				error: { code: "NOT_FOUND", message: "Documento não encontrado" },
			});
		await requireEventAccess(userId, eventId);
		await DocumentService.delete(id);
		return reply.status(204).send();
	});
}
