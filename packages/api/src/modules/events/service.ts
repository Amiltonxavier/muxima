import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error";
import { EventRepository } from "./repository";

export const EventService = {
	async create(
		userId: string,
		data: {
			name: string;
			type: "ENGAGEMENT" | "WEDDING";
			eventDate?: string;
			description?: string;
		},
	) {
		const event = await EventRepository.create({
			ownerId: userId,
			name: data.name,
			type: data.type,
			eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
			description: data.description,
		});

		// Auto-add creator as OWNER
		await (await import("../members/repository")).MemberRepository.create({
			eventId: event.id,
			userId,
			role: "OWNER",
			status: "ACTIVE",
		});

		return event;
	},

	async findById(id: string, userId: string) {
		const event = await EventRepository.findById(id);
		if (!event) throw new NotFoundError("Evento não encontrado");

		const isMember = event.members.some((m) => m.userId === userId);
		if (!isMember) throw new ForbiddenError("Não tem acesso a este evento");

		return event;
	},

	async findByUserId(userId: string) {
		return EventRepository.findByUserId(userId);
	},

	async update(id: string, userId: string, data: Record<string, unknown>) {
		const event = await EventRepository.findById(id);
		if (!event) throw new NotFoundError("Evento não encontrado");

		const member = event.members.find((m) => m.userId === userId);
		if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
			throw new ForbiddenError("Não tem permissão para editar este evento");
		}

		return EventRepository.update(id, data);
	},

	async delete(id: string, userId: string) {
		const event = await EventRepository.findById(id);
		if (!event) throw new NotFoundError("Evento não encontrado");

		const member = event.members.find((m) => m.userId === userId);
		if (member?.role !== "OWNER") {
			throw new ForbiddenError("Apenas o proprietário pode eliminar o evento");
		}

		return EventRepository.delete(id);
	},
};
