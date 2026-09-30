import { auth, getUserAccess } from "@muxima/auth";
import db from "@muxima/db";
import { buildChanges, createActivityLog } from "@muxima/db/activity-log";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { profileSelect, UserService } from "../modules/users/service";
import { buildActivityLog } from "../shared/activity/activity-context";
import { requireEventAccess } from "../shared/auth/event-access";
import { BadRequestError, NotFoundError } from "../shared/errors/app-error";
import {
	PASSWORD_MISMATCH_MESSAGE,
	passwordConfirmationSchema,
	passwordSchema,
} from "../shared/validation/password";

/**
 * Account + profile management.
 *
 * `getProfile` returns every field the system currently stores for a user so
 * the Profile page can render it all (personal info, contacts, account state,
 * security and activity) without extra round-trips. Fields are never invented
 * — this mirrors the `User` model plus the aggregated session/event counts —
 * and it appends the caller's roles and permissions, resolved from the same
 * `EventMember` rows the session and the authorization checks read.
 */
export const usersRouter = {
	getProfile: protectedProcedure
		.route({
			method: "GET",
			summary: "Get the authenticated user's profile",
		})
		.handler(async ({ context }) => {
			const userId = context.session.user.id;
			const [user, access] = await Promise.all([
				db.user.findUnique({
					where: { id: userId },
					select: profileSelect,
				}),
				getUserAccess(userId),
			]);

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
				// Same source as the session payload and the permission checks —
				// never recomputed on the client.
				roles: access.roles,
				permissions: access.permissions,
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
			const userId = context.session.user.id;
			const data = {
				...(input.name !== undefined ? { name: input.name } : {}),
				...(input.email !== undefined ? { email: input.email } : {}),
				...(input.phone !== undefined ? { phone: input.phone } : {}),
			};

			const previous = await db.user.findUnique({
				where: { id: userId },
				select: { name: true, email: true, phone: true },
			});

			const updated = await UserService.updateProfile(userId, data);

			if (previous) {
				await createActivityLog(
					buildActivityLog(context, {
						userId,
						action: "PROFILE_UPDATED",
						resource: "PROFILE",
						description: "Perfil atualizado",
						metadata: {
							changes: buildChanges(previous, updated, [
								"name",
								"email",
								"phone",
							]),
						},
					}),
				);
			}

			return updated;
		}),

	/**
	 * Changes the caller's own password.
	 *
	 * The credential work is delegated to Better Auth, which owns hashing and
	 * verifies the current password — this endpoint adds the application's
	 * complexity policy (Better Auth only enforces length), records the activity
	 * trail, and revokes the caller's other sessions so a stolen token stops
	 * working the moment the password changes.
	 *
	 * Neither password is ever persisted, logged or returned.
	 */
	changePassword: protectedProcedure
		.input(
			z
				.object({
					currentPassword: z
						.string()
						.min(1, "Palavra-passe atual é obrigatória"),
					newPassword: passwordSchema,
					confirmNewPassword: passwordConfirmationSchema,
				})
				.refine((data) => data.newPassword === data.confirmNewPassword, {
					message: PASSWORD_MISMATCH_MESSAGE,
					path: ["confirmNewPassword"],
				}),
		)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			// Authorization here is *self-scope*, not a permission gate. The
			// input carries no user id, so the target is structurally the caller
			// and "changing someone else's password" is not expressible — which
			// is the actual requirement. Deliberately not gated on
			// `profile.password.change`: a password belongs to the account, not to
			// an event, so gating it on an event role would lock out VIEWERs and
			// users who have not joined an event yet. The permission is kept as a
			// client-side hint so the UI can decide whether to show the form.
			try {
				await auth.api.changePassword({
					body: {
						currentPassword: input.currentPassword,
						newPassword: input.newPassword,
						// Ends every other session. The current one is refreshed, so the
						// user stays signed in on this device.
						revokeOtherSessions: true,
					},
					headers: context.requestHeaders,
				});
			} catch (error) {
				// Better Auth raises a bare "Invalid email or password" for a wrong
				// current password. Translate it to our own error so the client gets
				// a stable, actionable message — and without echoing the credential.
				if (error instanceof APIError) {
					throw new BadRequestError("A palavra-passe atual está incorreta");
				}
				throw error;
			}

			await createActivityLog(
				buildActivityLog(context, {
					userId,
					action: "PASSWORD_CHANGED",
					resource: "PROFILE",
					description: "Palavra-passe alterada",
				}),
			);

			return { success: true };
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
