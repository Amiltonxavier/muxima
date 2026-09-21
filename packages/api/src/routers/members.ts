import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { requireEventAccess } from "../shared/auth/event-access";
import { memberListInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

export const membersRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }).merge(memberListInput))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
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
			await requireEventAccess(context.session.user.id, input.eventId);

			const user = await db.user.findUnique({
				where: { email: input.email },
			});
			if (!user) {
				throw new Error("Utilizador não encontrado com este email");
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
				throw new Error("Utilizador já é membro deste evento");
			}

			const member = await db.eventMember.create({
				data: {
					eventId: input.eventId,
					userId: user.id,
					role: input.role,
					status: "PENDING",
				},
				include: { user: true },
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
			if (!member) throw new Error("Membro não encontrado");

			await requireEventAccess(context.session.user.id, member.eventId);

			const updated = await db.eventMember.update({
				where: { id: input.memberId },
				data: { role: input.role },
				include: { user: true },
			});

			return updated;
		}),

	remove: protectedProcedure
		.input(z.object({ memberId: z.string() }))
		.handler(async ({ context, input }) => {
			const member = await db.eventMember.findUnique({
				where: { id: input.memberId },
			});
			if (!member) throw new Error("Membro não encontrado");

			await requireEventAccess(context.session.user.id, member.eventId);

			if (member.role === "OWNER") {
				throw new Error("Não é possível remover o proprietário");
			}

			await db.eventMember.delete({
				where: { id: input.memberId },
			});

			return { success: true };
		}),
};
