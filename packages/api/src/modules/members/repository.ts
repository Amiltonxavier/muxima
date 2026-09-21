import db from "@muxima/db";
import type { MemberRole, MemberStatus, Prisma } from "@muxima/db/prisma";

export type MemberFilterParams = {
	search?: string;
	role?: MemberRole;
	status?: MemberStatus;
};

function buildMemberWhere(
	eventId: string,
	filters?: MemberFilterParams,
): Prisma.EventMemberWhereInput {
	const conditions: Prisma.EventMemberWhereInput[] = [{ eventId }];

	if (filters?.search) {
		conditions.push({
			user: {
				OR: [
					{ name: { contains: filters.search, mode: "insensitive" } },
					{ email: { contains: filters.search, mode: "insensitive" } },
				],
			},
		});
	}
	if (filters?.role) {
		conditions.push({ role: filters.role });
	}
	if (filters?.status) {
		conditions.push({ status: filters.status });
	}

	return { AND: conditions };
}

export const MemberRepository = {
	create(data: {
		eventId: string;
		userId: string;
		role: "OWNER" | "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER";
		status?: "PENDING" | "ACTIVE" | "DECLINED";
	}) {
		return db.eventMember.create({
			data: {
				...data,
				status: data.status || "PENDING",
			},
		});
	},

	findByEventAndUser(eventId: string, userId: string) {
		return db.eventMember.findUnique({
			where: { eventId_userId: { eventId, userId } },
		});
	},

	findByEvent(
		eventId: string,
		pagination: { page: number; limit: number },
		filters?: MemberFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.eventMember.findMany({
			where: buildMemberWhere(eventId, filters),
			include: { user: true },
			skip,
			take: pagination.limit,
		});
	},

	countByEvent(eventId: string, filters?: MemberFilterParams) {
		return db.eventMember.count({ where: buildMemberWhere(eventId, filters) });
	},

	updateRole(
		id: string,
		role: "OWNER" | "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER",
	) {
		return db.eventMember.update({
			where: { id },
			data: { role },
		});
	},

	delete(id: string) {
		return db.eventMember.delete({ where: { id } });
	},
};
