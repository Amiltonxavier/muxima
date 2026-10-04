import db from "@muxima/db";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../../shared/errors/app-error";
import {
	EVENT_CODES,
	MEMBER_CODES,
	USER_CODES,
} from "../../shared/errors/codes";
import { assertEventIsMutable } from "../../shared/events/event-lock";
import { EventRepository } from "../events/repository";
import { type MemberFilterParams, MemberRepository } from "./repository";

export const MemberService = {
	async addMember(
		eventId: string,
		userId: string,
		email: string,
		role: "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER",
	) {
		const event = await EventRepository.findById(eventId);
		if (!event)
			throw new NotFoundError("Evento não encontrado", {
				code: EVENT_CODES.NOT_FOUND,
			});

		assertEventIsMutable(event);

		const requester = event.members.find((m) => m.userId === userId);
		if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
			throw new ForbiddenError("Não tem permissão para adicionar membros", {
				code: EVENT_CODES.ROLE_REQUIRED,
			});
		}

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
		const event = await EventRepository.findById(eventId);
		if (!event)
			throw new NotFoundError("Evento não encontrado", {
				code: EVENT_CODES.NOT_FOUND,
			});

		const isMember = event.members.some((m) => m.userId === userId);
		if (!isMember)
			throw new ForbiddenError("Não tem acesso a este evento", {
				code: EVENT_CODES.ACCESS_DENIED,
			});

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

		const event = await EventRepository.findById(member.eventId);
		if (!event)
			throw new NotFoundError("Evento não encontrado", {
				code: EVENT_CODES.NOT_FOUND,
			});

		assertEventIsMutable(event);

		const requester = event.members.find((m) => m.userId === userId);
		if (requester?.role !== "OWNER") {
			throw new ForbiddenError("Apenas o proprietário pode alterar roles", {
				code: EVENT_CODES.ROLE_REQUIRED,
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

		const event = await EventRepository.findById(member.eventId);
		if (!event)
			throw new NotFoundError("Evento não encontrado", {
				code: EVENT_CODES.NOT_FOUND,
			});

		assertEventIsMutable(event);

		const requester = event.members.find((m) => m.userId === userId);
		if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
			throw new ForbiddenError("Não tem permissão para remover membros", {
				code: EVENT_CODES.ROLE_REQUIRED,
			});
		}

		if (member.role === "OWNER") {
			throw new ForbiddenError("Não é possível remover o proprietário", {
				code: MEMBER_CODES.OWNER_PROTECTED,
			});
		}

		return MemberRepository.delete(memberId);
	},
};
