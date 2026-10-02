import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Exercises the single RSVP eligibility rule and the public schedule lookup
 * against a Prisma-flavoured in-memory double.
 */

// ── Database double ──────────────────────────────────────────────

type InvitationRow = {
	id: string;
	code: string;
	publishedAt: Date | null;
	status: string;
	expiresAt: Date | null;
	rsvpStatus?: string;
	event: {
		id: string;
		status: string;
		eventDate: Date | null;
		startTime: string | null;
		endTime: string | null;
		capacity: number | null;
		limitGuestCapacity: boolean;
	};
	guests: { guest: { id: string; status: string } }[];
};

type ScheduleRow = {
	id: string;
	eventId: string;
	title: string;
	description: string | null;
	startAt: Date;
	endAt: Date | null;
	location: string | null;
	responsible: string | null;
	status: string;
};

let invitations: InvitationRow[] = [];
let schedules: ScheduleRow[] = [];

function buildDb() {
	return {
		guestInvitation: {
			findUnique: (args: { where: { code: string } }) =>
				Promise.resolve(
					invitations.find((inv) => inv.code === args.where.code) ?? null,
				),
		},
		schedule: {
			findMany: (args: {
				where: { eventId: string; status?: { not: string } };
				orderBy: { startAt: "asc" };
				select?: unknown;
			}) => {
				let rows = schedules.filter((s) => s.eventId === args.where.eventId);
				if (args.where.status?.not) {
					rows = rows.filter((s) => s.status !== args.where.status?.not);
				}
				rows = [...rows].sort(
					(a, b) => a.startAt.getTime() - b.startAt.getTime(),
				);
				// Return only the publicly selected fields.
				return Promise.resolve(
					rows.map(({ title, description, startAt, endAt, location }) => ({
						title,
						description,
						startAt,
						endAt,
						location,
					})),
				);
			},
		},
	};
}

vi.mock("@muxima/db", () => ({ default: buildDb() }));

const { canRespondToInvitation, getPublicSchedule } = await import("./service");

const FUTURE = new Date("2026-12-20T15:00:00.000Z");
const NOW = new Date("2026-09-30T12:00:00.000Z");

function makeInvitation(overrides: Partial<InvitationRow> = {}): InvitationRow {
	return {
		id: "inv_1",
		code: "MUX-ABCD-EFGH",
		publishedAt: new Date(NOW.getTime() - 86_400_000),
		status: "OPENED",
		expiresAt: null,
		event: {
			id: "evt_1",
			status: "CONFIRMED",
			eventDate: FUTURE,
			startTime: "15:00",
			endTime: "02:00",
			capacity: 100,
			limitGuestCapacity: false,
		},
		guests: [],
		...overrides,
	};
}

beforeEach(() => {
	invitations = [makeInvitation()];
	schedules = [
		{
			id: "sch_2",
			eventId: "evt_1",
			title: "Cerimónia",
			description: "Casamento religioso",
			startAt: new Date(FUTURE.getTime() + 3_600_000),
			endAt: new Date(FUTURE.getTime() + 7_200_000),
			location: "Igreja",
			responsible: "someone",
			status: "PENDING",
		},
		{
			id: "sch_1",
			eventId: "evt_1",
			title: "Receção",
			description: null,
			startAt: FUTURE,
			endAt: null,
			location: "Entrada",
			responsible: "someone",
			status: "PENDING",
		},
		{
			id: "sch_3",
			eventId: "evt_1",
			title: "Ensaio (cancelado)",
			description: null,
			startAt: FUTURE,
			endAt: null,
			location: null,
			responsible: "someone",
			status: "CANCELLED",
		},
	];
});

describe("canRespondToInvitation — the single RSVP rule", () => {
	it("accepts a CONFIRMED future event with a live invitation", () => {
		const result = canRespondToInvitation(
			{ status: "OPENED", expiresAt: null },
			{
				status: "CONFIRMED",
				eventDate: FUTURE,
				startTime: "15:00",
				endTime: "02:00",
			},
			NOW,
		);
		expect(result).toEqual({ responseable: true, reason: null });
	});

	it("rejects a CANCELLED event", () => {
		const result = canRespondToInvitation(
			{ status: "OPENED", expiresAt: null },
			{
				status: "CANCELLED",
				eventDate: FUTURE,
				startTime: "15:00",
				endTime: null,
			},
			NOW,
		);
		expect(result.responseable).toBe(false);
		expect(result.reason).toBe("EVENT_CANCELLED");
	});

	it("rejects a COMPLETED event", () => {
		const result = canRespondToInvitation(
			{ status: "OPENED", expiresAt: null },
			{
				status: "COMPLETED",
				eventDate: FUTURE,
				startTime: "15:00",
				endTime: null,
			},
			NOW,
		);
		expect(result.responseable).toBe(false);
		expect(result.reason).toBe("EVENT_FINISHED");
	});

	it("rejects a DRAFT event", () => {
		const result = canRespondToInvitation(
			{ status: "OPENED", expiresAt: null },
			{
				status: "DRAFT",
				eventDate: FUTURE,
				startTime: "15:00",
				endTime: null,
			},
			NOW,
		);
		expect(result.responseable).toBe(false);
		expect(result.reason).toBe("EVENT_NOT_CONFIRMED");
	});

	it("rejects a PLANNING event", () => {
		const result = canRespondToInvitation(
			{ status: "OPENED", expiresAt: null },
			{
				status: "PLANNING",
				eventDate: FUTURE,
				startTime: "15:00",
				endTime: null,
			},
			NOW,
		);
		expect(result.responseable).toBe(false);
		expect(result.reason).toBe("EVENT_NOT_CONFIRMED");
	});

	it("rejects an event whose date already passed (end of day)", () => {
		const result = canRespondToInvitation(
			{ status: "OPENED", expiresAt: null },
			{
				status: "CONFIRMED",
				eventDate: new Date("2026-09-01T15:00:00.000Z"),
				startTime: "15:00",
				endTime: "20:00",
			},
			NOW,
		);
		expect(result.responseable).toBe(false);
		expect(result.reason).toBe("EVENT_FINISHED");
	});

	it("rejects a cancelled invitation even on a live event", () => {
		const result = canRespondToInvitation(
			{ status: "CANCELLED", expiresAt: null },
			{
				status: "CONFIRMED",
				eventDate: FUTURE,
				startTime: "15:00",
				endTime: null,
			},
			NOW,
		);
		expect(result.responseable).toBe(false);
		expect(result.reason).toBe("CANCELLED");
	});

	it("rejects an expired invitation", () => {
		const result = canRespondToInvitation(
			{ status: "OPENED", expiresAt: new Date("2026-01-01T00:00:00.000Z") },
			{
				status: "CONFIRMED",
				eventDate: FUTURE,
				startTime: "15:00",
				endTime: null,
			},
			NOW,
		);
		expect(result.responseable).toBe(false);
		expect(result.reason).toBe("EXPIRED");
	});

	it("rejects an ONGOING event whose end already passed", () => {
		const result = canRespondToInvitation(
			{ status: "OPENED", expiresAt: null },
			{
				status: "ONGOING",
				eventDate: new Date("2026-09-30T10:00:00.000Z"),
				startTime: "10:00",
				endTime: "11:00",
			},
			NOW,
		);
		expect(result.responseable).toBe(false);
		expect(result.reason).toBe("EVENT_FINISHED");
	});
});

describe("getPublicSchedule — read-only public programme", () => {
	it("returns presentation fields ordered by start time", async () => {
		const result = await getPublicSchedule(buildDb() as never, "MUX-ABCD-EFGH");

		expect(result.result).toBe("AVAILABLE");
		if (result.result !== "AVAILABLE") return;

		expect(result.items.map((item) => item.title)).toEqual([
			"Receção",
			"Cerimónia",
		]);
		// No internal fields leak.
		for (const item of result.items) {
			expect(Object.keys(item).sort()).toEqual([
				"description",
				"endAt",
				"location",
				"startAt",
				"title",
			]);
		}
	});

	it("hides cancelled entries", async () => {
		const result = await getPublicSchedule(buildDb() as never, "MUX-ABCD-EFGH");
		if (result.result !== "AVAILABLE") return;

		expect(result.items.some((item) => item.title.includes("cancelado"))).toBe(
			false,
		);
	});

	it("returns NOT_FOUND for an unknown code", async () => {
		const result = await getPublicSchedule(buildDb() as never, "MUX-XXXX-YYYY");
		expect(result.result).toBe("NOT_FOUND");
	});

	it("treats an unpublished invitation as NOT_FOUND (no enumeration)", async () => {
		invitations = [makeInvitation({ publishedAt: null })];

		const result = await getPublicSchedule(buildDb() as never, "MUX-ABCD-EFGH");
		expect(result.result).toBe("NOT_FOUND");
	});

	it("treats a cancelled invitation as NOT_FOUND", async () => {
		invitations = [makeInvitation({ status: "CANCELLED" })];

		const result = await getPublicSchedule(buildDb() as never, "MUX-ABCD-EFGH");
		expect(result.result).toBe("NOT_FOUND");
	});

	it("treats an expired invitation as NOT_FOUND", async () => {
		invitations = [
			makeInvitation({ expiresAt: new Date("2026-01-01T00:00:00.000Z") }),
		];

		const result = await getPublicSchedule(buildDb() as never, "MUX-ABCD-EFGH");
		expect(result.result).toBe("NOT_FOUND");
	});
});
