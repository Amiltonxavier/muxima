import type { Prisma, PrismaClient } from "@muxima/db/prisma";
import type {
	Dedication,
	DedicationListItem,
	DedicationStats,
	DedicationStatus,
	DedicationType,
	DedicationVisibilityFilter,
	RichTextNode,
} from "../../shared/types/entities";
import { richTextToExcerpt } from "./rich-text";

/**
 * Every function takes the db client so the same data access works both
 * against the global client and inside `db.$transaction`.
 */
export type DedicationDb = PrismaClient | Prisma.TransactionClient;

export type DedicationFilterParams = {
	search?: string;
	type?: DedicationType;
	status?: DedicationStatus;
	visibility?: Exclude<DedicationVisibilityFilter, "ALL">;
};

/** The row as stored, with the relations the list and detail need. */
export const DEDICATION_INCLUDE = {
	owner: { select: { id: true, name: true, email: true } },
	viewers: { select: { id: true, eventMemberId: true, lastOpenedAt: true } },
} satisfies Prisma.DedicationInclude;

export type DedicationRecord = Dedication & {
	owner: { id: string; name: string; email: string };
	viewers: { id: string; eventMemberId: string; lastOpenedAt: Date | null }[];
};

const ownerSelect = { id: true, name: true, email: true } as const;

/**
 * Rows the requester is allowed to *know about*: the ones they own plus the
 * ones explicitly shared with them. Content is never part of this query — the
 * list only needs the excerpt.
 */
export function buildVisibleWhere(
	eventId: string,
	userId: string,
	filters?: DedicationFilterParams,
): Prisma.DedicationWhereInput {
	const conditions: Prisma.DedicationWhereInput[] = [
		{
			eventId,
			OR: [
				{ ownerId: userId },
				{
					isLocked: false,
					viewers: {
						some: { eventMember: { userId, status: "ACTIVE" } },
					},
				},
			],
		},
	];

	if (filters?.search) {
		conditions.push({
			title: { contains: filters.search, mode: "insensitive" },
		});
	}
	if (filters?.type) {
		conditions.push({ type: filters.type });
	}
	if (filters?.status) {
		conditions.push({ status: filters.status });
	}
	if (filters?.visibility === "PRIVATE") {
		conditions.push({ isLocked: true });
	} else if (filters?.visibility === "SHARED") {
		conditions.push({ isLocked: false });
	}

	return { AND: conditions };
}

export function toListItem(
	record: DedicationRecord,
	userId: string,
): DedicationListItem {
	const isOwner = record.ownerId === userId;
	return {
		id: record.id,
		eventId: record.eventId,
		ownerId: record.ownerId,
		title: record.title,
		type: record.type,
		status: record.status,
		isLocked: record.isLocked,
		lastOpenedAt: record.lastOpenedAt,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		owner: record.owner,
		access: isOwner ? "OWNER" : "VIEWER",
		viewerCount: record.isLocked ? 0 : record.viewers.length,
		excerpt: richTextToExcerpt(record.content as RichTextNode),
	};
}

export const DedicationRepository = {
	findVisible(
		db: DedicationDb,
		eventId: string,
		userId: string,
		pagination: { page: number; limit: number },
		filters?: DedicationFilterParams,
	) {
		const skip = (pagination.page - 1) * pagination.limit;
		return db.dedication.findMany({
			where: buildVisibleWhere(eventId, userId, filters),
			include: DEDICATION_INCLUDE,
			orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
			skip,
			take: pagination.limit,
		});
	},

	countVisible(
		db: DedicationDb,
		eventId: string,
		userId: string,
		filters?: DedicationFilterParams,
	) {
		return db.dedication.count({
			where: buildVisibleWhere(eventId, userId, filters),
		});
	},

	/**
	 * Scoped by `eventId` on purpose: a dedication from another event can never
	 * be reached by guessing its id, even by a member of that other event.
	 */
	findByIdForEvent(db: DedicationDb, eventId: string, id: string) {
		return db.dedication.findFirst({
			where: { id, eventId },
			include: DEDICATION_INCLUDE,
		});
	},

	findViewerGrant(db: DedicationDb, dedicationId: string, userId: string) {
		return db.dedicationViewer.findFirst({
			where: { dedicationId, eventMember: { userId, status: "ACTIVE" } },
		});
	},

	findViewerGrantByMember(
		db: DedicationDb,
		dedicationId: string,
		eventMemberId: string,
	) {
		return db.dedicationViewer.findFirst({
			where: { dedicationId, eventMemberId },
		});
	},

	listViewers(db: DedicationDb, dedicationId: string) {
		return db.dedicationViewer.findMany({
			where: { dedicationId },
			include: {
				eventMember: {
					select: {
						id: true,
						userId: true,
						role: true,
						status: true,
						user: { select: ownerSelect },
					},
				},
			},
			orderBy: { createdAt: "asc" },
		});
	},

	/** Members eligible to be granted access: active members of the event. */
	listEligibleMembers(
		db: DedicationDb,
		eventId: string,
		excludeUserId: string,
	) {
		return db.eventMember.findMany({
			where: { eventId, status: "ACTIVE", userId: { not: excludeUserId } },
			select: {
				id: true,
				userId: true,
				role: true,
				status: true,
				user: { select: ownerSelect },
			},
			orderBy: { createdAt: "asc" },
		});
	},

	findEventMember(db: DedicationDb, id: string) {
		return db.eventMember.findUnique({ where: { id } });
	},

	findMembership(db: DedicationDb, eventId: string, userId: string) {
		return db.eventMember.findFirst({
			where: { eventId, userId, status: "ACTIVE" },
		});
	},

	findViewerById(db: DedicationDb, dedicationId: string, id: string) {
		return db.dedicationViewer.findFirst({
			where: { id, dedicationId },
		});
	},

	// ── Writes ─────────────────────────────────────────────────────

	create(
		db: DedicationDb,
		data: {
			eventId: string;
			ownerId: string;
			title: string;
			type: DedicationType;
			status: DedicationStatus;
			content: RichTextNode;
		},
	) {
		return db.dedication.create({
			data: { ...data, isLocked: true },
			include: DEDICATION_INCLUDE,
		});
	},

	update(
		db: DedicationDb,
		id: string,
		data: Partial<{
			title: string;
			type: DedicationType;
			status: DedicationStatus;
			content: RichTextNode;
		}>,
	) {
		return db.dedication.update({
			where: { id },
			data,
			include: DEDICATION_INCLUDE,
		});
	},

	setLock(db: DedicationDb, id: string, isLocked: boolean) {
		return db.dedication.update({ where: { id }, data: { isLocked } });
	},

	markOpened(db: DedicationDb, id: string, openedAt: Date) {
		return db.dedication.update({
			where: { id },
			data: { lastOpenedAt: openedAt },
		});
	},

	markViewerOpened(db: DedicationDb, id: string, openedAt: Date) {
		return db.dedicationViewer.update({
			where: { id },
			data: { lastOpenedAt: openedAt },
		});
	},

	addViewer(db: DedicationDb, dedicationId: string, eventMemberId: string) {
		return db.dedicationViewer.create({
			data: { dedicationId, eventMemberId },
		});
	},

	removeViewer(db: DedicationDb, id: string) {
		return db.dedicationViewer.delete({ where: { id } });
	},

	removeAllViewers(db: DedicationDb, dedicationId: string) {
		return db.dedicationViewer.deleteMany({ where: { dedicationId } });
	},

	delete(db: DedicationDb, id: string) {
		return db.dedication.delete({ where: { id } });
	},

	// ── Stats (aggregated by the backend, never by the frontend) ────

	async getStats(
		db: DedicationDb,
		eventId: string,
		userId: string,
	): Promise<DedicationStats> {
		const [grouped, viewerGrants] = await Promise.all([
			db.dedication.groupBy({
				by: ["status", "isLocked", "ownerId"],
				where: buildVisibleWhere(eventId, userId),
				_count: { _all: true },
			}),
			db.dedicationViewer.findMany({
				where: {
					eventMember: { userId, status: "ACTIVE" },
					dedication: { eventId },
				},
				select: { lastOpenedAt: true, dedicationId: true },
			}),
		]);

		const stats: DedicationStats = {
			total: 0,
			notStarted: 0,
			draft: 0,
			inProgress: 0,
			ready: 0,
			privateCount: 0,
			sharedCount: 0,
			sharedWithMe: 0,
			openedByMe: 0,
		};

		const sharedWithMeIds = new Set<string>();
		for (const grant of viewerGrants) sharedWithMeIds.add(grant.dedicationId);

		for (const row of grouped) {
			const count = row._count._all;
			stats.total += count;
			if (row.status === "NOT_STARTED") stats.notStarted += count;
			if (row.status === "DRAFT") stats.draft += count;
			if (row.status === "IN_PROGRESS") stats.inProgress += count;
			if (row.status === "READY") stats.ready += count;
			if (row.isLocked) {
				stats.privateCount += count;
			} else {
				stats.sharedCount += count;
			}
			if (row.ownerId !== userId && !row.isLocked) {
				stats.sharedWithMe += count;
			}
		}

		stats.openedByMe = viewerGrants.filter(
			(grant) => grant.lastOpenedAt !== null,
		).length;

		return stats;
	},
};
