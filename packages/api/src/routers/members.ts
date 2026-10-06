import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";
import { PERMISSIONS } from "@muxima/permissions";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { MemberRepository } from "../modules/members/repository";
import {
	requireEventPermission,
	requireEventPermissionMutable,
} from "../shared/auth/authorization";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../shared/errors/app-error";
import { MEMBER_CODES, USER_CODES } from "../shared/errors/codes";
import { memberListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

export const membersRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }).merge(memberListInput))
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.MEMBER_READ,
			);
			const { page, limit, skip } = parsePagination(input);

			const filterConditions: Prisma.EventMemberWhereInput[] = [
				{ eventId: input.eventId },
			];

			if (input.search) {
				filterConditions.push({
					user: {
						OR: [
							{ name: { contains: input.search, mode: "insensitive" } },
							{ email: { contains: input.search, mode: "insensitive" } },
						],
					},
				});
			}

			if (input.role) {
				filterConditions.push({ role: input.role });
			}

			if (input.status) {
				filterConditions.push({ status: input.status });
			}

			const where: Prisma.EventMemberWhereInput = {
				AND: filterConditions,
			};

			const [members, total] = await Promise.all([
				db.eventMember.findMany({
					where,
					include: { user: true },
					orderBy: { createdAt: "desc" },
					skip,
					take: limit,
				}),
				db.eventMember.count({ where }),
			]);

			return { data: members, meta: getPaginationMeta(total, page, limit) };
		}),

	add: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				email: z.string().email(),
				role: z.enum(["PARTNER", "ADMIN", "EDITOR", "VIEWER"]),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.MEMBER_ADD,
			);

			const user = await db.user.findUnique({
				where: { email: input.email },
			});
			if (!user) {
				throw new NotFoundError("Utilizador não encontrado com este email", {
					code: USER_CODES.NOT_FOUND,
				});
			}

			const existing = await db.eventMember.findUnique({
				where: {
					eventId_userId: {
						eventId: input.eventId,
						userId: user.id,
					},
				},
			});
			if (existing) {
				throw new ConflictError("Utilizador já é membro deste evento", {
					code: MEMBER_CODES.ALREADY_EXISTS,
				});
			}

			const member = await MemberRepository.create({
				eventId: input.eventId,
				userId: user.id,
				role: input.role,
				status: "PENDING",
			});

			return member;
		}),

	updateRole: protectedProcedure
		.input(
			z.object({
				memberId: z.string(),
				role: z.enum(["PARTNER", "ADMIN", "EDITOR", "VIEWER"]),
			}),
		)
		.handler(async ({ context, input }) => {
			const member = await db.eventMember.findUnique({
				where: { id: input.memberId },
			});
			if (!member)
				throw new NotFoundError("Membro não encontrado", {
					code: MEMBER_CODES.NOT_FOUND,
				});

			await requireEventPermissionMutable(
				context.session.user.id,
				member.eventId,
				PERMISSIONS.MEMBER_UPDATE_ROLE,
			);

			// `OWNER` is not a delegable role: it is the one assignment that
			// would hand over the event itself. Changing it is an explicit
			// ownership transfer, never a side effect of a role update.
			if (member.role === "OWNER") {
				throw new ForbiddenError(
					"A role do proprietário não pode ser alterada",
					{ code: MEMBER_CODES.OWNER_PROTECTED },
				);
			}

			const updated = await MemberRepository.updateRole(
				input.memberId,
				input.role,
			);

			return updated;
		}),

	remove: protectedProcedure
		.input(z.object({ memberId: z.string() }))
		.handler(async ({ context, input }) => {
			const member = await db.eventMember.findUnique({
				where: { id: input.memberId },
			});
			if (!member)
				throw new NotFoundError("Membro não encontrado", {
					code: MEMBER_CODES.NOT_FOUND,
				});

			await requireEventPermissionMutable(
				context.session.user.id,
				member.eventId,
				PERMISSIONS.MEMBER_REMOVE,
			);

			if (member.role === "OWNER") {
				throw new ForbiddenError("Não é possível remover o proprietário", {
					code: MEMBER_CODES.OWNER_PROTECTED,
				});
			}

			await db.eventMember.delete({
				where: { id: input.memberId },
			});

			return { success: true };
		}),
};
