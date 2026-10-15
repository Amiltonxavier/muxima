import db from "@muxima/db";
import type { MemberRole, MemberStatus, Prisma } from "@muxima/db/prisma";

/**
 * The status a unified team row can carry.
 *
 * Memberships only ever hold a `MemberStatus`; the extra `CANCELLED` belongs to
 * invites the owner revoked. Filters accept it so a caller can narrow the whole
 * feed to that tab — no membership can ever match it.
 */
export type EventMemberStatus = MemberStatus | "CANCELLED";

export type MemberFilterParams = {
	search?: string;
	role?: MemberRole;
	status?: EventMemberStatus;
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
	if (filters?.status === "CANCELLED") {
		// CANCELLED is an invitation state: no `EventMember` can hold it, so the
		// member side of this filter is empty by definition.
		conditions.push({ status: { in: [] } });
	} else if (filters?.status) {
		conditions.push({ status: filters.status });
	}

	return { AND: conditions };
}

/**
 * Resolve the persisted `Role` row for a role name.
 *
 * `EventMember` keeps BOTH the `role` enum and the `roleId` foreign key, and
 * authorization reads `roleId` first. Writing the enum without the FK would
 * leave the membership pointing at nothing, so the two are always set together
 * from this single place rather than at each call site.
 */
async function resolveRoleId(role: MemberRole): Promise<string | null> {
	const row = await db.role.findUnique({
		where: { name: role },
		select: { id: true },
	});
	return row?.id ?? null;
}

export const MemberRepository = {
	async create(data: {
		eventId: string;
		userId: string;
		role: "OWNER" | "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER";
		status?: "PENDING" | "ACTIVE" | "DECLINED";
	}) {
		return db.eventMember.create({
			data: {
				...data,
				status: data.status || "PENDING",
				roleId: await resolveRoleId(data.role),
			},
		});
	},

	findById(id: string) {
		return db.eventMember.findUnique({ where: { id } });
	},

	findByEventAndUser(eventId: string, userId: string) {
		return db.eventMember.findUnique({
			where: { eventId_userId: { eventId, userId } },
		});
	},

	/**
	 * Every filtered membership of an event, unpaginated.
	 *
	 * The team list merges memberships with pending invitations in memory (to
	 * interleave them in one ordered feed), so it cannot ask the database for a
	 * page: it needs the candidate set first. Bounded in practice by the number
	 * of people on one event's team.
	 */
	findAllByEvent(eventId: string, filters?: MemberFilterParams) {
		return db.eventMember.findMany({
			where: buildMemberWhere(eventId, filters),
			include: { user: true },
			orderBy: { createdAt: "desc" },
		});
	},

	async updateRole(id: string, role: MemberRole) {
		return db.eventMember.update({
			where: { id },
			data: { role, roleId: await resolveRoleId(role) },
		});
	},

	delete(id: string) {
		return db.eventMember.delete({ where: { id } });
	},
};
