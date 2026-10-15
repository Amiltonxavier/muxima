import { auth, getUserAccess } from "@muxima/auth";
import db from "@muxima/db";
import { buildChanges, createActivityLog } from "@muxima/db/activity-log";
import { MailService } from "@muxima/mail";
import { PERMISSIONS } from "@muxima/permissions";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { inviteMember } from "../modules/members/invitations";
import { MemberRepository } from "../modules/members/repository";
import { profileSelect, UserService } from "../modules/users/service";
import { buildActivityLog } from "../shared/activity/activity-context";
import {
	requireEventPermission,
	requireEventPermissionMutable,
} from "../shared/auth/authorization";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../shared/errors/app-error";
import { AUTH_CODES, MEMBER_CODES, USER_CODES } from "../shared/errors/codes";
import { eventPageUrl, roleLabel, rolePermissionLabels } from "../shared/mail";
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

			if (!user)
				throw new NotFoundError("Utilizador não encontrado", {
					code: USER_CODES.NOT_FOUND,
				});

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
					throw new BadRequestError("A palavra-passe atual está incorreta", {
						code: AUTH_CODES.INVALID_CREDENTIALS,
					});
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

			// Security alert. SMTP is fire-and-forget (never blocks the change,
			// never throws), but the request awaits it so the e-mail is enqueued
			// before the response is sent.
			await MailService.sendPasswordChanged({
				to: context.session.user.email,
				name: context.session.user.name,
				at: new Date(),
				ip: context.ip,
			});

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

			// Informational e-mail sent after the block is persisted, so the
			// account is already locked regardless of delivery.
			await MailService.sendAccountBlocked({
				to: user.email,
				reason: input.reason,
			});

			return { user, revokedSessions, success: true };
		}),

	/**
	 * Re-activates the caller's own account. Only reachable while another
	 * session still exists (see `UserService.unblockAccount`); a fully locked
	 * account needs support.
	 */
	unblockAccount: protectedProcedure.handler(async ({ context }) => {
		const user = await UserService.unblockAccount(context.session.user.id);

		await MailService.sendAccountUnblocked({
			to: user.email,
			name: context.session.user.name,
		});

		return { user, success: true };
	}),

	getMembers: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.MEMBER_READ,
			);
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
			await requireEventPermissionMutable(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.MEMBER_INVITE,
			);

			// One invitation lifecycle for the whole API: duplicate checks,
			// secure token, e-mail, in-app + realtime notification all live in
			// the service, so token and in-app invites can never drift.
			return inviteMember({
				eventId: input.eventId,
				email: input.email,
				role: input.role,
				invitedBy: context.session.user.id,
			});
		}),

	removeMember: protectedProcedure
		.input(z.object({ id: z.string() }))
		.handler(async ({ context, input }) => {
			const member = await db.eventMember.findUnique({
				where: { id: input.id },
				select: { eventId: true, role: true },
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
			if (member.role === "OWNER")
				throw new ForbiddenError("Não é possível remover o proprietário", {
					code: MEMBER_CODES.OWNER_PROTECTED,
				});
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
				select: { eventId: true, role: true },
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

			if (member.role === "OWNER") {
				throw new ForbiddenError(
					"A role do proprietário não pode ser alterada",
					{ code: MEMBER_CODES.OWNER_PROTECTED },
				);
			}

			const updatedMember = await MemberRepository.updateRole(
				input.id,
				input.role,
			);

			// Same permissions-notice as `members.updateRole` — the profile and
			// the event team page both change roles, so both surfaces must be
			// consistent. SMTP cannot fail the change (`deliverMail` never throws).
			const [memberMeta, eventMeta] = await Promise.all([
				db.eventMember.findUnique({
					where: { id: input.id },
					select: { user: { select: { email: true, name: true } } },
				}),
				db.event.findUnique({
					where: { id: member.eventId },
					select: { name: true },
				}),
			]);

			if (memberMeta?.user?.email) {
				await MailService.sendPermissionsChanged({
					to: memberMeta.user.email,
					name: memberMeta.user.name,
					eventName: eventMeta?.name ?? "evento",
					roleLabel: roleLabel(input.role),
					permissionLabels: rolePermissionLabels(input.role),
					eventUrl: eventPageUrl(member.eventId),
				});
			}

			return updatedMember;
		}),
};
