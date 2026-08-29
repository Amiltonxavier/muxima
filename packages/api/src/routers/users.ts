import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const usersRouter = {
	getProfile: protectedProcedure.handler(async ({ context }) => {
		const user = await db.user.findUnique({
			where: { id: context.session.user.id },
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
				emailVerified: true,
				createdAt: true,
			},
		});

		return user;
	}),

	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).optional(),
				email: z.string().email().optional(),
				phone: z.string().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const user = await db.user.update({
				where: { id: context.session.user.id },
				data: {
					name: input.name,
					email: input.email,
				},
			});

			return user;
		}),

	getMembers: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ input }) => {
			const members = await db.eventMember.findMany({
				where: { eventId: input.eventId },
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
				},
			});

			return members;
		}),

	inviteMember: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				email: z.string().email(),
				role: z.enum(["PARTNER", "ADMIN", "EDITOR", "VIEWER"]),
			}),
		)
		.handler(async ({ context, input }) => {
			const existingMember = await db.eventMember.findFirst({
				where: {
					eventId: input.eventId,
					user: {
						email: input.email,
					},
				},
			});

			if (existingMember) {
				throw new Error("Este utilizador já é membro do evento");
			}

			const invitation = await db.eventInvitation.create({
				data: {
					eventId: input.eventId,
					invitedBy: context.session.user.id,
					email: input.email,
					role: input.role,
					token: Math.random().toString(36).substring(2, 15),
					expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
				},
			});

			return invitation;
		}),

	removeMember: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ input }) => {
			await db.eventMember.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	updateMemberRole: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				role: z.enum(["PARTNER", "ADMIN", "EDITOR", "VIEWER"]),
			}),
		)
		.handler(async ({ input }) => {
			const member = await db.eventMember.update({
				where: { id: input.id },
				data: {
					role: input.role,
				},
			});

			return member;
		}),
};
