import type { FastifyInstance } from "fastify";
import { successResponse } from "../../shared/http/response";
import { addMemberSchema, updateMemberRoleSchema } from "./schemas";
import { MemberService } from "./service";

export async function memberRoutes(app: FastifyInstance) {
	app.get("/api/v1/events/:eventId/members", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

		const { eventId } = request.params as { eventId: string };
		const members = await MemberService.getMembers(eventId, userId);
		return successResponse(members);
	});

	app.post("/api/v1/events/:eventId/members", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

		const body = request.body as Record<string, unknown>;
		const params = request.params as { eventId: string };
		const data = addMemberSchema.parse({ ...body, eventId: params.eventId });
		const member = await MemberService.addMember(
			data.eventId,
			userId,
			data.email,
			data.role,
		);
		return reply.status(201).send(successResponse(member));
	});

	app.patch("/api/v1/members/:memberId/role", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

		const { memberId } = request.params as { memberId: string };
		const { role } = updateMemberRoleSchema.parse(request.body);
		const member = await MemberService.updateRole(memberId, userId, role);
		return successResponse(member);
	});

	app.delete("/api/v1/members/:memberId", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

		const { memberId } = request.params as { memberId: string };
		await MemberService.removeMember(memberId, userId);
		return reply.status(204).send();
	});
}
