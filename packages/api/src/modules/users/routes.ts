import type { FastifyInstance } from "fastify";
import { requireSessionUserId } from "../../shared/auth/auth-middleware";
import { successResponse } from "../../shared/http/response";
import { UserService } from "./service";

export async function userRoutes(app: FastifyInstance) {
	app.get("/api/v1/users/profile", async (request) => {
		const userId = await requireSessionUserId(request);
		const profile = await UserService.getProfile(userId);
		return successResponse(profile);
	});

	app.patch("/api/v1/users/profile", async (request) => {
		const userId = await requireSessionUserId(request);
		const data = request.body as {
			name?: string;
			email?: string;
			phone?: string;
		};
		const profile = await UserService.updateProfile(userId, data);
		return successResponse(profile);
	});
}
