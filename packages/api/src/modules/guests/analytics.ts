import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";

/**
 * Guest + table analytics.
 *
 * Extracted from the `guests` router so the router, the event summary report
 * and the export layer all read the same aggregation. There is exactly one
 * implementation of "how many people are coming", on the server.
 */

export type GuestStatusKey =
	| "PENDING"
	| "CONFIRMED"
	| "DECLINED"
	| "WAITING"
	| "MAYBE"
	| "CANCELLED";

export type GuestTypeKey = "FAMILY" | "FRIEND" | "COLLEAGUE" | "VIP" | "OTHER";

export type GuestAnalytics = {
	totalGuests: number;
	confirmed: number;
	pending: number;
	declined: number;
	waiting: number;
	maybe: number;
	cancelled: number;
	totalCompanions: number;
	confirmedCompanions: number;
	totalConfirmedPeople: number;
	confirmationRate: number;
	capacity: number;
	limitGuestCapacity: boolean;
	atCapacity: boolean;
	byType: Record<
		GuestTypeKey,
		{ total: number; confirmed: number; pending: number; declined: number }
	>;
	byStatus: Record<GuestStatusKey, number>;
};

export type TableAnalytics = {
	total: number;
	totalCapacity: number;
	totalOccupied: number;
	available: number;
	fullTables: number;
	partialTables: number;
	emptyTables: number;
	occupancyRate: number;
};

type Db = PrismaClient;

const GUEST_STATUS_KEYS: GuestStatusKey[] = [
	"PENDING",
	"CONFIRMED",
	"DECLINED",
	"WAITING",
	"MAYBE",
	"CANCELLED",
];

const GUEST_TYPE_KEYS: GuestTypeKey[] = [
	"FAMILY",
	"FRIEND",
	"COLLEAGUE",
	"VIP",
	"OTHER",
];

export async function getGuestAnalytics(
	client: Db,
	eventId: string,
): Promise<GuestAnalytics> {
	const event = await client.event.findUnique({
		where: { id: eventId },
		select: { capacity: true, limitGuestCapacity: true },
	});

	const [
		totalGuests,
		confirmed,
		pending,
		declined,
		waiting,
		maybe,
		cancelled,
		totalCompanions,
		confirmedCompanions,
		typeRows,
	] = await Promise.all([
		client.guest.count({ where: { eventId } }),
		client.guest.count({ where: { eventId, status: "CONFIRMED" } }),
		client.guest.count({ where: { eventId, status: "PENDING" } }),
		client.guest.count({ where: { eventId, status: "DECLINED" } }),
		client.guest.count({ where: { eventId, status: "WAITING" } }),
		client.guest.count({ where: { eventId, status: "MAYBE" } }),
		client.guest.count({ where: { eventId, status: "CANCELLED" } }),
		client.guestCompanion.count({ where: { guest: { eventId } } }),
		client.guestCompanion.count({
			where: { guest: { eventId }, status: "CONFIRMED" },
		}),
		client.guest.groupBy({
			by: ["type", "status"],
			where: { eventId },
			_count: { _all: true },
		}),
	]);

	const byStatus = Object.fromEntries(
		GUEST_STATUS_KEYS.map((key) => [key, 0]),
	) as Record<GuestStatusKey, number>;
	byStatus.PENDING = pending;
	byStatus.CONFIRMED = confirmed;
	byStatus.DECLINED = declined;
	byStatus.WAITING = waiting;
	byStatus.MAYBE = maybe;
	byStatus.CANCELLED = cancelled;

	const byType = Object.fromEntries(
		GUEST_TYPE_KEYS.map((key) => [
			key,
			{ total: 0, confirmed: 0, pending: 0, declined: 0 },
		]),
	) as GuestAnalytics["byType"];

	for (const row of typeRows) {
		const stats = byType[row.type as GuestTypeKey];
		if (!stats) continue;
		const count = row._count._all;
		stats.total += count;
		if (row.status === "CONFIRMED") stats.confirmed += count;
		else if (row.status === "PENDING") stats.pending += count;
		else if (row.status === "DECLINED") stats.declined += count;
	}

	const totalConfirmedPeople = confirmed + confirmedCompanions;
	const capacity = event?.capacity ?? 0;

	return {
		totalGuests,
		confirmed,
		pending,
		declined,
		waiting,
		maybe,
		cancelled,
		totalCompanions,
		confirmedCompanions,
		totalConfirmedPeople,
		confirmationRate:
			totalGuests > 0 ? Math.round((confirmed / totalGuests) * 100) : 0,
		capacity,
		limitGuestCapacity: event?.limitGuestCapacity ?? false,
		atCapacity: capacity > 0 && totalConfirmedPeople >= capacity,
		byType,
		byStatus,
	};
}

export async function getTableAnalytics(
	client: Db,
	eventId: string,
): Promise<TableAnalytics> {
	const where = { eventId, deletedAt: null };

	const [total, capacityAgg, occupied, tableRows] = await Promise.all([
		client.table.count({ where }),
		client.table.aggregate({ where, _sum: { capacity: true } }),
		client.tableGuest.count({
			where: { table: { eventId, deletedAt: null } },
		}),
		client.table.findMany({
			where,
			select: { capacity: true, _count: { select: { tableGuests: true } } },
		}),
	]);

	let fullTables = 0;
	let partialTables = 0;
	let emptyTables = 0;

	for (const table of tableRows) {
		const occupiedSeats = table._count.tableGuests;
		if (occupiedSeats >= table.capacity) fullTables += 1;
		else if (occupiedSeats > 0) partialTables += 1;
		else emptyTables += 1;
	}

	const totalCapacity = capacityAgg._sum.capacity ?? 0;

	return {
		total,
		totalCapacity,
		totalOccupied: occupied,
		available: Math.max(0, totalCapacity - occupied),
		fullTables,
		partialTables,
		emptyTables,
		occupancyRate:
			totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 100) : 0,
	};
}

/** Default instance used by routers and exports. */
export const guestAnalytics = {
	getGuests: (eventId: string) => getGuestAnalytics(db, eventId),
	getTables: (eventId: string) => getTableAnalytics(db, eventId),
};
