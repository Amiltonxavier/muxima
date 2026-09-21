import db from "@muxima/db";
import type { GuestStatus, GuestType, Prisma } from "@muxima/db/prisma";

export type GuestFilterParams = {
	search?: string;
	status?: GuestStatus;
	type?: GuestType;
};

export type TableFilterParams = {
	search?: string;
};

function buildGuestWhere(
	eventId: string,
	filters?: GuestFilterParams,
): Prisma.GuestWhereInput {
	const conditions: Prisma.GuestWhereInput[] = [{ eventId }];

	if (filters?.search) {
		conditions.push({
			OR: [
				{ name: { contains: filters.search, mode: "insensitive" } },
				{ email: { contains: filters.search, mode: "insensitive" } },
				{ phone: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}
	if (filters?.status) {
		conditions.push({ status: filters.status });
	}
	if (filters?.type) {
		conditions.push({ type: filters.type });
	}

	return { AND: conditions };
}

function buildTableWhere(
	eventId: string,
	filters?: TableFilterParams,
): Prisma.TableWhereInput {
	const conditions: Prisma.TableWhereInput[] = [{ eventId, deletedAt: null }];

	if (filters?.search) {
		conditions.push({
			OR: [
				{ name: { contains: filters.search, mode: "insensitive" } },
				{ location: { contains: filters.search, mode: "insensitive" } },
				{ notes: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}

	return { AND: conditions };
}

export const GuestRepository = {
	findByEventId(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: GuestFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.guest.findMany({
			where: buildGuestWhere(eventId, filters),
			include: { companions: true, invitations: true, tableGuests: true },
			orderBy: { createdAt: "desc" },
			skip,
			take: pagination.limit,
		});
	},

	countByEventId(eventId: string, filters?: GuestFilterParams) {
		return db.guest.count({ where: buildGuestWhere(eventId, filters) });
	},

	findById(id: string) {
		return db.guest.findUnique({
			where: { id },
			include: { companions: true, invitations: true, tableGuests: true },
		});
	},

	create(data: {
		eventId: string;
		name: string;
		phone?: string;
		email?: string;
		group?: string;
		type: GuestType;
		companionsLimit?: number;
		notes?: string;
	}) {
		return db.guest.create({ data });
	},

	update(
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
		return db.guest.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.guest.delete({ where: { id } });
	},

	addCompanion(data: { guestId: string; name: string }) {
		return db.guestCompanion.create({ data });
	},

	removeCompanion(id: string) {
		return db.guestCompanion.delete({ where: { id } });
	},

	getTablesByEvent(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: TableFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.table.findMany({
			where: buildTableWhere(eventId, filters),
			include: { tableGuests: { include: { guest: true } } },
			skip,
			take: pagination.limit,
		});
	},

	countTablesByEvent(eventId: string, filters?: TableFilterParams) {
		return db.table.count({ where: buildTableWhere(eventId, filters) });
	},

	createTable(data: {
		eventId: string;
		name: string;
		capacity: number;
		number?: number;
		location?: string;
		notes?: string;
	}) {
		return db.table.create({ data });
	},

	assignToTable(tableId: string, guestId: string) {
		return db.tableGuest.create({ data: { tableId, guestId } });
	},

	removeFromTable(tableId: string, guestId: string) {
		return db.tableGuest.delete({
			where: { tableId_guestId: { tableId, guestId } },
		});
	},
};
