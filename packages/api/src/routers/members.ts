import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { requireEventAccess } from "../shared/auth/event-access";

export const membersRouter = {
	list: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const members = await db.eventMember.findMany({
				where: { eventId: input.eventId },
				include: { user: true },
				orderBy: { createdAt: "desc" },
			});

			return members;
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
