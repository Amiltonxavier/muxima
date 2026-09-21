import db from "@muxima/db";
import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error";
import {
	type GuestFilterParams,
	GuestRepository,
	type TableFilterParams,
} from "./repository";

export const GuestService = {
	async findByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: GuestFilterParams,
	) {
		const [data, total] = await Promise.all([
			GuestRepository.findByEventId(eventId, pagination, filters),
			GuestRepository.countByEventId(eventId, filters),
		]);
		return { data, total };
	},

	async findById(id: string) {
		const guest = await GuestRepository.findById(id);
		if (!guest) throw new NotFoundError("Convidado não encontrado");
		return guest;
	},

	async create(
		eventId: string,
		data: {
			name: string;
			phone?: string;
			email?: string;
			group?: string;
			type: "FAMILY" | "FRIEND" | "COLLEAGUE" | "VIP" | "OTHER";
			companionsLimit?: number;
			notes?: string;
		},
	) {
		return GuestRepository.create({ eventId, ...data });
	},

	async update(
		id: string,
		data: Partial<{
			name: string;
			phone: string;
			email: string;
			group: string;
			type: "FAMILY" | "FRIEND" | "COLLEAGUE" | "VIP" | "OTHER";
			status: "PENDING" | "CONFIRMED" | "DECLINED" | "WAITING";
			companionsLimit: number;
			notes: string;
		}>,
	) {
		const guest = await GuestRepository.findById(id);
		if (!guest) throw new NotFoundError("Convidado não encontrado");
		return GuestRepository.update(id, data);
	},

	async delete(id: string) {
		const guest = await GuestRepository.findById(id);
		if (!guest) throw new NotFoundError("Convidado não encontrado");
		return GuestRepository.delete(id);
	},

	async addCompanion(guestId: string, name: string) {
		const guest = await GuestRepository.findById(guestId);
		if (!guest) throw new NotFoundError("Convidado não encontrado");
		if (guest.companions.length >= guest.companionsLimit) {
			throw new ForbiddenError("Limite de acompanhantes atingido");
		}
		return GuestRepository.addCompanion({ guestId, name });
	},

	async removeCompanion(companionId: string) {
		return GuestRepository.removeCompanion(companionId);
	},

	async getTables(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: TableFilterParams,
	) {
		const [data, total] = await Promise.all([
			GuestRepository.getTablesByEvent(eventId, pagination, filters),
			GuestRepository.countTablesByEvent(eventId, filters),
		]);
		return { data, total };
	},

	async createTable(
		eventId: string,
		data: {
			name: string;
			capacity: number;
			number?: number;
			location?: string;
			notes?: string;
		},
	) {
		return GuestRepository.createTable({ eventId, ...data });
	},

	async assignToTable(tableId: string, guestId: string) {
		const table = await db.table.findUnique({
			where: { id: tableId },
			include: { tableGuests: true },
		});
		if (!table) throw new NotFoundError("Mesa não encontrada");
		if (table.tableGuests.length >= table.capacity) {
			throw new ForbiddenError("Mesa lotada");
		}
		return GuestRepository.assignToTable(tableId, guestId);
	},

	async removeFromTable(tableId: string, guestId: string) {
		return GuestRepository.removeFromTable(tableId, guestId);
	},
};
