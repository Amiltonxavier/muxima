import db from "@muxima/db";
import { PERMISSIONS } from "@muxima/permissions";
import {
	requireEventPermission,
	requireEventPermissionMutable,
} from "../../shared/auth/authorization";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../../shared/errors/app-error";
import { MEMBER_CODES } from "../../shared/errors/codes";
import { cancelInvitation, inviteMember } from "./invitations";
import { listEventMembers } from "./list";
import { type MemberFilterParams, MemberRepository } from "./repository";

export const MemberService = {
	async addMember(
		eventId: string,
		userId: string,
		email: string,
		role: "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER",
	) {
		await requireEventPermissionMutable(
			userId,
			eventId,
			PERMISSIONS.MEMBER_ADD,
		);

		// REST and oRPC share one invitation lifecycle. The membership row is
		// created on acceptance, never here.
		return inviteMember({ eventId, email, role, invitedBy: userId });
	},

	async getMembers(
		eventId: string,
		userId: string,
		pagination: { page: number; limit: number },
		filters?: MemberFilterParams,
	) {
		await requireEventPermission(userId, eventId, PERMISSIONS.MEMBER_READ);

		// Same unified feed as the oRPC path: memberships + pending/cancelled
		// invites.
		const { data, total, counts } = await listEventMembers({
			eventId,
			page: pagination.page,
			limit: pagination.limit,
			search: filters?.search,
			role: filters?.role,
			status: filters?.status,
		});
		return { data, total, counts };
	},

	async updateRole(
		memberId: string,
		userId: string,
		newRole: "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER",
	) {
		const member = await MemberRepository.findById(memberId);

		// REST reaches the same unified list, so the same row id may be an
		// invitation; editing its role edits the invitation.
		if (!member) {
			const invitation = await db.eventInvitation.findUnique({
				where: { id: memberId },
			});
			if (!invitation)
				throw new NotFoundError("Membro não encontrado", {
					code: MEMBER_CODES.NOT_FOUND,
				});

			await requireEventPermissionMutable(
				userId,
				invitation.eventId,
				PERMISSIONS.MEMBER_UPDATE_ROLE,
			);

			if (invitation.status !== "PENDING") {
				throw new ConflictError("Este convite já não está pendente", {
					code: MEMBER_CODES.INVITE_NOT_PENDING,
				});
			}

			return db.eventInvitation.update({
				where: { id: memberId },
				data: { role: newRole },
				select: { id: true, role: true },
			});
		}

		await requireEventPermissionMutable(
			userId,
			member.eventId,
			PERMISSIONS.MEMBER_UPDATE_ROLE,
		);

		// Same rule as the oRPC path (`members.updateRole`): the OWNER row is
		// never a valid target of a role update. Without this, REST would let a
		// caller demote the owner while oRPC refused — one policy, both surfaces.
		if (member.role === "OWNER") {
			throw new ForbiddenError("A role do proprietário não pode ser alterada", {
				code: MEMBER_CODES.OWNER_PROTECTED,
			});
		}

		return MemberRepository.updateRole(memberId, newRole);
	},

	async removeMember(memberId: string, userId: string) {
		const member = await MemberRepository.findById(memberId);

		if (!member) {
			const invitation = await db.eventInvitation.findUnique({
				where: { id: memberId },
			});
			if (!invitation)
				throw new NotFoundError("Membro não encontrado", {
					code: MEMBER_CODES.NOT_FOUND,
				});

			await requireEventPermissionMutable(
				userId,
				invitation.eventId,
				PERMISSIONS.MEMBER_REMOVE,
			);

			if (invitation.status !== "PENDING") {
				throw new ConflictError("Este convite já não está pendente", {
					code: MEMBER_CODES.INVITE_NOT_PENDING,
				});
			}

			return cancelInvitation(invitation.id);
		}

		await requireEventPermissionMutable(
			userId,
			member.eventId,
			PERMISSIONS.MEMBER_REMOVE,
		);

		if (member.role === "OWNER") {
			throw new ForbiddenError("Não é possível remover o proprietário", {
				code: MEMBER_CODES.OWNER_PROTECTED,
			});
		}

		return MemberRepository.delete(memberId);
	},
};
