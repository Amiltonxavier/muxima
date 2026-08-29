import type { FastifyInstance } from "fastify";
import { successResponse } from "../../shared/http/response";
import { UserService } from "./service";

export async function userRoutes(app: FastifyInstance) {
	app.get("/api/v1/users/profile", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const profile = await UserService.getProfile(userId);
		return successResponse(profile);
	});

	app.patch("/api/v1/users/profile", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
		const data = request.body as {
			name?: string;
			email?: string;
			phone?: string;
		};
		const profile = await UserService.updateProfile(userId, data);
		return successResponse(profile);
	});
}
