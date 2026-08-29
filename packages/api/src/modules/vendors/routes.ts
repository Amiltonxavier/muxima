import type { FastifyInstance } from "fastify";
import { successResponse } from "../../shared/http/response";
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
		const vendors = await VendorService.findByEventId(eventId);
		return successResponse(vendors);
	});

	app.get("/api/v1/vendors/:id", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const { id } = request.params as { id: string };
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
		await VendorService.delete(id);
		return reply.status(204).send();
	});
}
