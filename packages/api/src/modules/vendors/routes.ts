import type { FastifyInstance } from "fastify";
import {
	getEventIdForResource,
	requireEventAccess,
} from "../../shared/auth/event-access";
import { listResponse, successResponse } from "../../shared/http/response";
import { getPaginationMeta, parsePagination } from "../../shared/utils/helpers";
import {
	VALID_VENDOR_CATEGORIES,
	VALID_VENDOR_STATUSES,
	validateEnum,
} from "../../shared/utils/validate-enum";
import { createVendorSchema, updateVendorSchema } from "./schemas";
import { VendorService } from "./service";

export async function vendorRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/vendors", async (request, reply) => {
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
			category: validateEnum(query.category, VALID_VENDOR_CATEGORIES),
			status: validateEnum(query.status, VALID_VENDOR_STATUSES),
		};
		const result = await VendorService.findByEventId(
			eventId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
	});

	app.get("/api/v1/vendors/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("vendor", id);
		if (!eventId)
			return reply.status(404).send({
				error: { code: "NOT_FOUND", message: "Fornecedor não encontrado" },
			});
		await requireEventAccess(userId, eventId);
		const vendor = await VendorService.findById(id);
		return successResponse(vendor);
	});

	app.post("/api/v1/events/:eventId/vendors", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { eventId } = request.params as { eventId: string };
		const data = createVendorSchema.parse(request.body);
		const vendor = await VendorService.create(eventId, data);
		return reply.status(201).send(successResponse(vendor));
	});

	app.patch("/api/v1/vendors/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("vendor", id);
		if (!eventId)
			return reply.status(404).send({
				error: { code: "NOT_FOUND", message: "Fornecedor não encontrado" },
			});
		await requireEventAccess(userId, eventId);
		const data = updateVendorSchema.parse(request.body);
		const vendor = await VendorService.update(id, data);
		return successResponse(vendor);
	});

	app.delete("/api/v1/vendors/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
		const eventId = await getEventIdForResource("vendor", id);
		if (!eventId)
			return reply.status(404).send({
				error: { code: "NOT_FOUND", message: "Fornecedor não encontrado" },
			});
		await requireEventAccess(userId, eventId);
		await VendorService.delete(id);
		return reply.status(204).send();
	});
}
