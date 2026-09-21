import db from "@muxima/db";
import type { EventStatus, EventType, Prisma } from "@muxima/db/prisma";

export type EventFilterParams = {
	search?: string;
	status?: EventStatus;
	type?: EventType;
};

function buildEventWhere(
	userId: string,
	filters?: EventFilterParams,
): Prisma.EventWhereInput {
	const membershipWhere: Prisma.EventWhereInput = {
		members: { some: { userId } },
	};

	const filterConditions: Prisma.EventWhereInput[] = [];

	if (filters?.search) {
		filterConditions.push({
			OR: [
				{ name: { contains: filters.search, mode: "insensitive" } },
				{ venueName: { contains: filters.search, mode: "insensitive" } },
				{ description: { contains: filters.search, mode: "insensitive" } },
			],
		});
	}
	if (filters?.status) {
		filterConditions.push({ status: filters.status });
	}
	if (filters?.type) {
		filterConditions.push({ type: filters.type });
	}

	return {
		AND: [membershipWhere, ...filterConditions],
	};
}

export const EventRepository = {
	create(data: {
		ownerId: string;
		name: string;
		type: "ENGAGEMENT" | "WEDDING";
		eventDate?: Date;
		description?: string;
	}) {
		return db.event.create({ data });
	},

	findById(id: string) {
		return db.event.findUnique({
			where: { id },
			include: { members: true, budget: true },
		});
	},

	findByUserId(
		userId: string,
		pagination: { page: number; limit: number },
		filters?: EventFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.event.findMany({
			where: buildEventWhere(userId, filters),
			include: { members: true, budget: true },
			orderBy: { createdAt: "desc" },
			skip,
			take: pagination.limit,
		});
	},

	countByUserId(userId: string, filters?: EventFilterParams) {
		return db.event.count({
			where: buildEventWhere(userId, filters),
		});
	},

	update(
		id: string,
		data: Partial<{
			name: string;
			eventDate: Date | null;
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
			status: "DRAFT" | "PLANNING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
		}>,
	) {
		return db.event.update({ where: { id }, data });
	},

	delete(id: string) {
		return db.event.delete({ where: { id } });
	},
};
