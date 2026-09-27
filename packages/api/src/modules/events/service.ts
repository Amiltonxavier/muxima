import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error";
import { syncEventLifecycle } from "./lifecycle";
import { type EventFilterParams, EventRepository } from "./repository";

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

		// Lazy lifecycle sync (backend is the authority for status changes).
		const status = await syncEventLifecycle(event);
		return status === event.status ? event : { ...event, status };
	},

	async findByUserId(
		userId: string,
		pagination: { page: number; limit: number },
		filters?: EventFilterParams,
	) {
		const [data, total] = await Promise.all([
			EventRepository.findByUserId(userId, pagination, filters),
			EventRepository.countByUserId(userId, filters),
		]);
		return { data, total };
	},

	async update(
		id: string,
		userId: string,
		data: Partial<{
			name: string;
			eventDate: string;
			startTime: string;
			endTime: string;
			venueName: string;
			address: string;
			province: string;
			municipality: string;
			neighborhood: string;
			reference: string;
			capacity: number;
			limitGuestCapacity: boolean;
			description: string;
			status:
				| "DRAFT"
				| "PLANNING"
				| "CONFIRMED"
				| "ONGOING"
				| "COMPLETED"
				| "CANCELLED";
		}>,
	) {
		const event = await EventRepository.findById(id);
		if (!event) throw new NotFoundError("Evento não encontrado");

		const member = event.members.find((m) => m.userId === userId);
		if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
			throw new ForbiddenError("Não tem permissão para editar este evento");
		}

		return EventRepository.update(id, {
			...data,
			eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
		});
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
