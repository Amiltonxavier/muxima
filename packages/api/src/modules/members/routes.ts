import type { FastifyInstance } from "fastify";
import { listResponse, successResponse } from "../../shared/http/response";
import { getPaginationMeta, parsePagination } from "../../shared/utils/helpers";
import {
	VALID_MEMBER_ROLES,
	VALID_MEMBER_STATUSES,
	validateEnum,
} from "../../shared/utils/validate-enum";
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
		const query = request.query as Record<string, string>;
		const { page, limit } = parsePagination(query);
		const filters = {
			search: query.search || undefined,
			role: validateEnum(query.role, VALID_MEMBER_ROLES),
			status: validateEnum(query.status, VALID_MEMBER_STATUSES),
		};
		const result = await MemberService.getMembers(
			eventId,
			userId,
			{ page, limit },
			filters,
		);
		return listResponse(
			result.data,
			getPaginationMeta(result.total, page, limit),
		);
	});

	app.post("/api/v1/events/:eventId/members", async (request, reply) => {
		const userId = request.session?.user?.id;
		if (!userId)
			return reply
				.status(401)
				.send({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } });

		const body = request.body as { email?: string; role?: string };
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
