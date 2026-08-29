import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../../shared/errors/app-error";
import { EventRepository } from "../events/repository";
import { MemberRepository } from "./repository";

export const MemberService = {
	async addMember(
		eventId: string,
		userId: string,
		email: string,
		role: string,
	) {
		const event = await EventRepository.findById(eventId);
		if (!event) throw new NotFoundError("Evento não encontrado");

		const requester = event.members.find((m) => m.userId === userId);
		if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
			throw new ForbiddenError("Não tem permissão para adicionar membros");
		}

		const existing = await MemberRepository.findByEventAndUser(eventId, email);
		if (existing)
			throw new ConflictError("Utilizador já é membro deste evento");

		return MemberRepository.create({ eventId, userId: email, role });
	},

	async getMembers(eventId: string, userId: string) {
		const event = await EventRepository.findById(eventId);
		if (!event) throw new NotFoundError("Evento não encontrado");

		const isMember = event.members.some((m) => m.userId === userId);
		if (!isMember) throw new ForbiddenError("Não tem acesso a este evento");

		return MemberRepository.findByEvent(eventId);
	},

	async updateRole(memberId: string, userId: string, newRole: string) {
		const member = await MemberRepository.findByEventAndUser("", memberId);
		if (!member) throw new NotFoundError("Membro não encontrado");

		const event = await EventRepository.findById(member.eventId);
		if (!event) throw new NotFoundError("Evento não encontrado");

		const requester = event.members.find((m) => m.userId === userId);
		if (requester?.role !== "OWNER") {
			throw new ForbiddenError("Apenas o proprietário pode alterar roles");
		}

		return MemberRepository.updateRole(memberId, newRole);
	},

	async removeMember(memberId: string, userId: string) {
		const member = await MemberRepository.findByEventAndUser("", memberId);
		if (!member) throw new NotFoundError("Membro não encontrado");

		const event = await EventRepository.findById(member.eventId);
		if (!event) throw new NotFoundError("Evento não encontrado");

		const requester = event.members.find((m) => m.userId === userId);
		if (!requester || !["OWNER", "ADMIN"].includes(requester.role)) {
			throw new ForbiddenError("Não tem permissão para remover membros");
		}

		if (member.role === "OWNER") {
			throw new ForbiddenError("Não é possível remover o proprietário");
		}

		return MemberRepository.delete(memberId);
	},
};
