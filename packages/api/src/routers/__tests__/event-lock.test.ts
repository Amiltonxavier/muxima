import { getRolePermissions, type Permission } from "@muxima/permissions";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * End-to-end check of the global operational lock through the real oRPC
 * procedures (schemas + middleware + error mapping included):
 *
 * - every event-data mutation of a locked event is rejected with
 *   `409 EVENT_LOCKED` and a PT-PT message;
 * - reads keep working;
 * - editing the event itself (fields/status) is NOT blocked;
 * - the invitation capacity rule rejects a party above
 *   `Event.maxGuestsPerInvitation`.
 */

type EventRow = {
	id: string;
	name: string;
	type: string;
	status: string;
	eventDate: Date | null;
	startTime: string | null;
	endTime: string | null;
	maxGuestsPerInvitation: number;
	members?: { userId: string; role: string }[];
};

type GuestRow = {
	id: string;
	eventId: string;
	companionsLimit: number;
	_count: { companions: number };
	invitationGuests: {
		invitationId?: string;
		invitation: { rsvpStatus: string };
	}[];
};

/** `RolePermission` rows for a role, as a seeded database would return them. */
function grantsFor(role: string) {
	return getRolePermissions(
		role as Parameters<typeof getRolePermissions>[0],
	).map((key) => ({ permission: { key: key as Permission } }));
}

const FUTURE = new Date(2027, 5, 20, 18, 0, 0, 0);
const PAST = new Date(2020, 0, 1, 18, 0, 0, 0);

let eventRow: EventRow;
let guestRows: GuestRow[] = [];
let guestDetail: GuestRow | null = null;
let invitationPeople: { guest: { _count: { companions: number } } }[] = [];
let updatedEvents: { where: { id: string }; data: Record<string, unknown> }[] =
	[];
let createdCompanions: { guestId: string; name: string }[] = [];

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
	return {
		id: "evt_1",
		name: "Casamento",
		type: "WEDDING",
		status: "CONFIRMED",
		eventDate: FUTURE,
		startTime: "18:00",
		endTime: "23:00",
		maxGuestsPerInvitation: 2,
		members: [{ userId: "usr_admin", role: "OWNER" }],
		...overrides,
	};
}

function makeGuest(overrides: Partial<GuestRow> = {}): GuestRow {
	return {
		id: "gst_1",
		eventId: "evt_1",
		companionsLimit: 10,
		_count: { companions: 0 },
		invitationGuests: [
			{ invitationId: "inv_1", invitation: { rsvpStatus: "PENDING" } },
		],
		...overrides,
	};
}

function buildDb() {
	return {
		user: {
			findUnique: () => Promise.resolve({ status: "ACTIVE" }),
		},
		eventMember: {
			findFirst: () =>
				Promise.resolve({ role: "OWNER", status: "ACTIVE", eventId: "evt_1" }),
		},
		// Authorization reads the granted capabilities from `RolePermission`,
		// so the double answers with the OWNER grants the seed would have
		// written. Serving the real matrix keeps this suite honest about which
		// capability each procedure needs instead of granting everything.
		rolePermission: { findMany: () => Promise.resolve(grantsFor("OWNER")) },
		event: {
			// One row feeds both the lock guard (`select`) and `events.update`
			// (`include.members`), so the returned shape covers the two.
			findUnique: () =>
				Promise.resolve(eventRow ? structuredClone(eventRow) : null),
			update: (args: {
				where: { id: string };
				data: Record<string, unknown>;
			}) => {
				updatedEvents.push({ where: args.where, data: args.data });
				return Promise.resolve({ ...eventRow, ...args.data });
			},
		},
		guest: {
			findUnique: () => Promise.resolve(guestDetail),
			findMany: () => Promise.resolve(guestRows),
			count: () => Promise.resolve(0),
			create: (args: { data: Record<string, unknown> }) =>
				Promise.resolve({ id: "gst_new", ...args.data }),
		},
		guestCompanion: {
			create: (args: { data: { guestId: string; name: string } }) => {
				createdCompanions.push(args.data);
				return Promise.resolve({ id: "gcp_new", ...args.data });
			},
		},
		guestInvitation: {
			findUnique: () => Promise.resolve({ guests: invitationPeople }),
			create: (args: { data: Record<string, unknown> }) =>
				Promise.resolve({ id: "inv_new", ...args.data }),
			count: () => Promise.resolve(0),
			groupBy: () => Promise.resolve([]),
		},
	};
}

vi.mock("@muxima/db", () => ({ default: buildDb() }));

vi.mock("@muxima/db/activity-log", () => ({
	createActivityLog: vi.fn(),
	buildChanges: () => [],
}));

vi.mock("@muxima/auth", () => ({
	BLOCKED_USER_MESSAGE: "blocked",
}));

vi.mock("../../modules/invitations/qr-code", () => ({
	buildInvitationQrPayload: vi.fn(() =>
		Promise.resolve({ url: "http://localhost/invite/X", qrCode: "<svg/>" }),
	),
	buildInvitationUrl: vi.fn(
		(code: string) => `http://localhost/invite/${code}`,
	),
}));

const { call } = await import("@orpc/server");
const { guestsRouter } = await import("../../routers/guests");
const { invitationsRouter } = await import("../../routers/invitations");
const { eventsRouter } = await import("../../routers/events");

const context = {
	session: { user: { id: "usr_admin" } },
	requestHeaders: new Headers(),
	userAgent: "vitest",
	ip: "10.0.0.1",
} as never;

/** oRPC errors carry the public code + HTTP status produced by `mapError`. */
async function expectRejection(
	run: Promise<unknown>,
	expected: { code: string; status: number; message?: RegExp },
): Promise<void> {
	await expect(run).rejects.toMatchObject({
		code: expected.code,
		status: expected.status,
		...(expected.message ? { message: expected.message } : {}),
	});
}

beforeEach(() => {
	eventRow = makeEvent();
	guestRows = [];
	guestDetail = null;
	invitationPeople = [];
	updatedEvents = [];
	createdCompanions = [];
});

describe("locked event — CANCELLED", () => {
	beforeEach(() => {
		eventRow = makeEvent({ status: "CANCELLED" });
	});

	it("rejects guest creation", async () => {
		await expectRejection(
			call(guestsRouter.create, { eventId: "evt_1", name: "Ana" }, { context }),
			{
				code: "EVENT_LOCKED",
				status: 409,
				message: /cancelado/i,
			},
		);
	});

	it("rejects table creation", async () => {
		await expectRejection(
			call(
				guestsRouter.createTable,
				{ eventId: "evt_1", name: "Mesa 1", capacity: 8 },
				{ context },
			),
			{ code: "EVENT_LOCKED", status: 409 },
		);
	});

	it("rejects invitation creation", async () => {
		await expectRejection(
			call(
				invitationsRouter.create,
				{ eventId: "evt_1", guestIds: ["gst_1"] },
				{ context },
			),
			{ code: "EVENT_LOCKED", status: 409 },
		);
	});

	it("rejects invitation publishing (share/publish)", async () => {
		await expectRejection(
			call(
				invitationsRouter.publish,
				{ eventId: "evt_1", invitationId: "inv_1" },
				{ context },
			),
			{ code: "EVENT_LOCKED", status: 409 },
		);
	});

	it("rejects batch publishing", async () => {
		await expectRejection(
			call(
				invitationsRouter.publishBatch,
				{ eventId: "evt_1", invitationIds: ["inv_1"] },
				{ context },
			),
			{ code: "EVENT_LOCKED", status: 409 },
		);
	});

	it("keeps reads working", async () => {
		const stats = await call(
			invitationsRouter.getStats,
			{ eventId: "evt_1" },
			{ context },
		);
		expect(stats.total).toBe(0);
	});
});

describe("locked event — more than 5 days after eventDateTime", () => {
	beforeEach(() => {
		eventRow = makeEvent({ status: "CONFIRMED", eventDate: PAST });
	});

	it("rejects guest creation with the temporal PT-PT message", async () => {
		await expectRejection(
			call(guestsRouter.create, { eventId: "evt_1", name: "Ana" }, { context }),
			{
				code: "EVENT_LOCKED",
				status: 409,
				message: /ultrapassou o período permitido/i,
			},
		);
	});
});

describe("locked event — exceptions (event maintenance)", () => {
	beforeEach(() => {
		eventRow = makeEvent({ status: "CANCELLED" });
	});

	it("still allows editing the event itself", async () => {
		const updated = await call(
			eventsRouter.update,
			{ id: "evt_1", name: "Casamento (revisado)" },
			{ context },
		);

		expect(updated.name).toBe("Casamento (revisado)");
		expect(updatedEvents).toHaveLength(1);
		expect(updatedEvents[0]?.data).toMatchObject({
			name: "Casamento (revisado)",
		});
	});

	it("still allows changing the event status", async () => {
		const updated = await call(
			eventsRouter.update,
			{ id: "evt_1", status: "PLANNING" },
			{ context },
		);

		expect(updated.status).toBe("PLANNING");
		expect(updatedEvents[0]?.data).toMatchObject({ status: "PLANNING" });
	});
});

describe("invitation capacity — maxGuestsPerInvitation", () => {
	it("rejects an invitation holding more people than the limit", async () => {
		eventRow = makeEvent({ maxGuestsPerInvitation: 2 });
		guestRows = [
			{ id: "g1", _count: { companions: 0 } },
			{ id: "g2", _count: { companions: 0 } },
			{ id: "g3", _count: { companions: 0 } },
		] as never;

		await expectRejection(
			call(
				invitationsRouter.create,
				{ eventId: "evt_1", guestIds: ["g1", "g2", "g3"] },
				{ context },
			),
			{
				code: "INVITATION_CAPACITY_REACHED",
				status: 400,
				message: /no máximo 2 pessoas/i,
			},
		);
	});

	it("allows an invitation within the limit", async () => {
		eventRow = makeEvent({ maxGuestsPerInvitation: 2 });
		guestRows = [
			{ id: "g1", _count: { companions: 0 } },
			{ id: "g2", _count: { companions: 0 } },
		] as never;

		const created = await call(
			invitationsRouter.create,
			{ eventId: "evt_1", guestIds: ["g1", "g2"] },
			{ context },
		);

		expect(created).toBeDefined();
	});

	it("blocks a companion that would cross the invitation limit", async () => {
		eventRow = makeEvent({ maxGuestsPerInvitation: 2 });
		// The guest is already in an invitation holding 2 people.
		guestDetail = makeGuest();
		invitationPeople = [
			{ guest: { _count: { companions: 0 } } },
			{ guest: { _count: { companions: 0 } } },
		];

		await expectRejection(
			call(
				guestsRouter.addCompanion,
				{ guestId: "gst_1", name: "Extra" },
				{ context },
			),
			{
				code: "INVITATION_CAPACITY_REACHED",
				status: 400,
				message: /no máximo 2 pessoas/i,
			},
		);
		expect(createdCompanions).toHaveLength(0);
	});

	it("allows a companion while the invitation stays within the limit", async () => {
		eventRow = makeEvent({ maxGuestsPerInvitation: 3 });
		guestDetail = makeGuest({ _count: { companions: 1 } });
		invitationPeople = [{ guest: { _count: { companions: 1 } } }];

		const companion = await call(
			guestsRouter.addCompanion,
			{ guestId: "gst_1", name: "Extra" },
			{ context },
		);

		expect(companion.name).toBe("Extra");
		expect(createdCompanions).toHaveLength(1);
	});
});
