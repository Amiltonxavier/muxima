import db from "@muxima/db";
import { MailService } from "@muxima/mail";
import { PERMISSIONS } from "@muxima/permissions";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { cancelInvitation, inviteMember } from "../modules/members/invitations";
import { listEventMembers } from "../modules/members/list";
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
import { MEMBER_CODES } from "../shared/errors/codes";
import { eventPageUrl, roleLabel, rolePermissionLabels } from "../shared/mail";
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
			const { page, limit } = parsePagination(input);

			// Memberships AND pending/cancelled team invitations in one feed: a
			// pending invite is shown as a pending member, a revoked one under
			// "Cancelados", and both would otherwise be invisible.
			const { data, total, counts } = await listEventMembers({
				eventId: input.eventId,
				page,
				limit,
				search: input.search,
				role: input.role,
				status: input.status,
			});

			return { data, meta: getPaginationMeta(total, page, limit), counts };
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

			// Adding a member means inviting one. A PENDING membership that
			// nobody ever activates made shared events look empty, so the
			// membership row is now created only when the invitee accepts.
			return inviteMember({
				eventId: input.eventId,
				email: input.email,
				role: input.role,
				invitedBy: context.session.user.id,
			});
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

			// The row id may also be a PENDING invitation (the team screen shows
			// invitations as pending members). Changing its role edits the
			// invitation, since no membership exists until acceptance.
			if (!member) {
				const invitation = await db.eventInvitation.findUnique({
					where: { id: input.memberId },
				});
				if (!invitation) {
					throw new NotFoundError("Membro não encontrado", {
						code: MEMBER_CODES.NOT_FOUND,
					});
				}

				await requireEventPermissionMutable(
					context.session.user.id,
					invitation.eventId,
					PERMISSIONS.MEMBER_UPDATE_ROLE,
				);

				if (invitation.status !== "PENDING") {
					throw new ConflictError("Este convite já não está pendente", {
						code: MEMBER_CODES.INVITE_NOT_PENDING,
					});
				}

				return db.eventInvitation.update({
					where: { id: input.memberId },
					data: { role: input.role },
					select: { id: true, role: true },
				});
			}

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

			// Inform the member about the capabilities their new role grants.
			// The e-mail is a notification, never a gate: `deliverMail` does not
			// throw, so an SMTP failure cannot roll back the role change.
			const [memberMeta, eventMeta] = await Promise.all([
				db.eventMember.findUnique({
					where: { id: input.memberId },
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

			return updated;
		}),

	remove: protectedProcedure
		.input(z.object({ memberId: z.string() }))
		.handler(async ({ context, input }) => {
			const member = await db.eventMember.findUnique({
				where: { id: input.memberId },
			});

			// Removing a pending member means cancelling its invitation: same
			// permission, same route, one row id from the unified team list.
			if (!member) {
				const invitation = await db.eventInvitation.findUnique({
					where: { id: input.memberId },
				});
				if (!invitation) {
					throw new NotFoundError("Membro não encontrado", {
						code: MEMBER_CODES.NOT_FOUND,
					});
				}

				await requireEventPermissionMutable(
					context.session.user.id,
					invitation.eventId,
					PERMISSIONS.MEMBER_REMOVE,
				);

				if (invitation.status !== "PENDING") {
					throw new ConflictError("Este convite já não está pendente", {
						code: MEMBER_CODES.INVITE_NOT_PENDING,
					});
				}

				await cancelInvitation(invitation.id);
				return { success: true };
			}

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
