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
import { MEMBER_CODES, USER_CODES } from "../../shared/errors/codes";
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

		// The email identifies the account to invite; the membership row needs
		// the user id (passing the email here used to fail the foreign key).
		const user = await db.user.findUnique({ where: { email } });
		if (!user)
			throw new NotFoundError("Utilizador não encontrado com este email", {
				code: USER_CODES.NOT_FOUND,
			});

		const existing = await MemberRepository.findByEventAndUser(
			eventId,
			user.id,
		);
		if (existing)
			throw new ConflictError("Utilizador já é membro deste evento", {
				code: MEMBER_CODES.ALREADY_EXISTS,
			});

		return MemberRepository.create({ eventId, userId: user.id, role });
	},

	async getMembers(
		eventId: string,
		userId: string,
		pagination: { page: number; limit: number },
		filters?: MemberFilterParams,
	) {
		await requireEventPermission(userId, eventId, PERMISSIONS.MEMBER_READ);

		const [data, total] = await Promise.all([
			MemberRepository.findByEvent(eventId, pagination, filters),
			MemberRepository.countByEvent(eventId, filters),
		]);
		return { data, total };
	},

	async updateRole(
		memberId: string,
		userId: string,
		newRole: "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER",
	) {
		const member = await MemberRepository.findById(memberId);
		if (!member)
			throw new NotFoundError("Membro não encontrado", {
				code: MEMBER_CODES.NOT_FOUND,
			});

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
		if (!member)
			throw new NotFoundError("Membro não encontrado", {
				code: MEMBER_CODES.NOT_FOUND,
			});

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
