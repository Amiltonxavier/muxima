import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { profileSelect, UserService } from "../modules/users/service";
import { requireEventAccess } from "../shared/auth/event-access";
import { NotFoundError } from "../shared/errors/app-error";

/**
 * Account + profile management.
 *
 * `getProfile` returns every field the system currently stores for a user so
 * the Profile page can render it all (personal info, contacts, account state,
 * security and activity) without extra round-trips. Fields are never invented
 * — this mirrors the `User` model plus the aggregated session/event counts.
 */
export const usersRouter = {
	getProfile: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const user = await db.user.findUnique({
			where: { id: userId },
			select: profileSelect,
		});

		if (!user) throw new NotFoundError("Utilizador não encontrado");

		const [activeSessions, ownedEventsCount, membershipsCount] =
			await Promise.all([
				db.session.count({
					where: { userId, expiresAt: { gt: new Date() } },
				}),
				db.event.count({ where: { ownerId: userId } }),
				db.eventMember.count({ where: { userId } }),
			]);

		return {
			...user,
			security: {
				emailVerified: user.emailVerified,
				activeSessions,
			},
			activity: {
				ownedEvents: ownedEventsCount,
				eventMemberships: membershipsCount,
			},
		};
	}),

	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().trim().min(1).optional(),
				email: z.string().email().optional(),
				phone: z.string().trim().min(1).max(30).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const data = {
				...(input.name !== undefined ? { name: input.name } : {}),
				...(input.email !== undefined ? { email: input.email } : {}),
				...(input.phone !== undefined ? { phone: input.phone } : {}),
			};
			return UserService.updateProfile(context.session.user.id, data);
		}),

	/**
	 * Blocks the current account. State is persisted on the `User` and every
	 * session is revoked, so the user is signed out immediately and cannot
	 * authenticate again until the account is unblocked.
	 */
	blockAccount: protectedProcedure
		.input(
			z.object({
				confirm: z.literal(true),
				reason: z.string().trim().max(280).optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const { user, revokedSessions } = await UserService.blockAccount(
				context.session.user.id,
				input.reason,
			);
			return { user, revokedSessions, success: true };
		}),

	getMembers: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return UserService.getMembers(input.eventId);
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
			await requireEventAccess(context.session.user.id, input.eventId);

			const existingMember = await db.eventMember.findFirst({
				where: {
					eventId: input.eventId,
					user: { email: input.email },
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
		.handler(async ({ context, input }) => {
			const member = await db.eventMember.findUnique({
				where: { id: input.id },
				select: { eventId: true, role: true },
			});
			if (!member) throw new NotFoundError("Membro não encontrado");
			await requireEventAccess(context.session.user.id, member.eventId);
			if (member.role === "OWNER")
				throw new Error("Não é possível remover o proprietário");
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
		.handler(async ({ context, input }) => {
			const member = await db.eventMember.findUnique({
				where: { id: input.id },
				select: { eventId: true },
			});
			if (!member) throw new NotFoundError("Membro não encontrado");
			await requireEventAccess(context.session.user.id, member.eventId, [
				"OWNER",
			]);
			const updatedMember = await db.eventMember.update({
				where: { id: input.id },
				data: {
					role: input.role,
				},
			});

			return updatedMember;
		}),
};
