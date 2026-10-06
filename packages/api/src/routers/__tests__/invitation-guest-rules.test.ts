import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The public respond endpoint must enforce the same eligibility rule the
 * public read exposes, and the private addCompanion endpoint must implement
 * the DECLINED-guest companion rule — both verified through the real
 * procedures so schemas and middleware run as in production.
 */

// ── Database double ──────────────────────────────────────────────

type InvitationRow = {
	id: string;
	code: string;
	publishedAt: Date | null;
	status: string;
	expiresAt: Date | null;
	response: string | null;
	rsvpStatus: string;
	event: {
		id: string;
		status: string;
		eventDate: Date | null;
		startTime: string | null;
		endTime: string | null;
		capacity: number | null;
		limitGuestCapacity: boolean;
		/** Required by `buildPublicInvitation`. */
		owner: { id: string; name: string; email: string };
	};
	guests: { guestId: string; guest: { id: string; status: string } }[];
};

type GuestRow = {
	id: string;
	eventId: string;
	name: string;
	companionsLimit: number;
	companions: { id: string; guestId: string; name: string; status: string }[];
	invitationGuests: {
		invitation: { rsvpStatus: string };
	}[];
};

let invitations: InvitationRow[] = [];
let guests: GuestRow[] = [];
let updatedInvitations: { id: string; data: Record<string, unknown> }[] = [];
let createdCompanions: { guestId: string; name: string }[] = [];

const FUTURE = new Date("2026-12-20T15:00:00.000Z");

/** Mirrors the database default of `Event.maxGuestsPerInvitation`. */
const MAX_GUESTS_PER_INVITATION = 2;

function makeInvitation(overrides: Partial<InvitationRow> = {}): InvitationRow {
	return {
		id: "inv_1",
		code: "MUX-ABCD-EFGH",
		publishedAt: new Date("2026-09-01T00:00:00.000Z"),
		status: "OPENED",
		expiresAt: null,
		response: null,
		rsvpStatus: "PENDING",
		event: {
			id: "evt_1",
			status: "CONFIRMED",
			eventDate: FUTURE,
			startTime: "15:00",
			endTime: "02:00",
			capacity: 100,
			limitGuestCapacity: false,
			owner: { id: "usr_host", name: "Anfitrião", email: "host@muxima.ao" },
		},
		guests: [{ guestId: "gst_1", guest: { id: "gst_1", status: "PENDING" } }],
		...overrides,
	};
}

function makeGuest(overrides: Partial<GuestRow> = {}): GuestRow {
	return {
		id: "gst_1",
		eventId: "evt_1",
		name: "Ana Silva",
		companionsLimit: 2,
		companions: [],
		invitationGuests: [{ invitation: { rsvpStatus: "PENDING" } }],
		...overrides,
	};
}

function buildDb() {
	return {
		user: {
			findUnique: () => Promise.resolve({ status: "ACTIVE" }),
		},
		guestInvitation: {
			findUnique: (args: {
				where: { code?: string; id?: string };
				include?: unknown;
				select?: unknown;
			}) => {
				if (args.where.code) {
					return Promise.resolve(
						invitations.find((inv) => inv.code === args.where.code) ?? null,
					);
				}
				return Promise.resolve(
					invitations.find((inv) => inv.id === args.where.id) ?? null,
				);
			},
			update: (args: {
				where: { id: string };
				data: Record<string, unknown>;
			}) => {
				updatedInvitations.push({ id: args.where.id, data: args.data });
				const invitation = invitations.find((inv) => inv.id === args.where.id);
				if (invitation) Object.assign(invitation, args.data);
				return Promise.resolve(invitation);
			},
		},
		guest: {
			updateMany: (args: {
				where: { id: { in: string[] } };
				data: unknown;
			}) => {
				for (const guest of guests) {
					if (args.where.id.in.includes(guest.id)) {
						Object.assign(guest, args.data as { status?: string });
					}
				}
				return Promise.resolve({ count: args.where.id.in.length });
			},
			findUnique: (args: {
				where: { id: string };
				select?: {
					_count?: unknown;
					invitationGuests?: unknown;
				};
			}) => {
				const guest = guests.find((g) => g.id === args.where.id);
				if (!guest) return Promise.resolve(null);
				return Promise.resolve({
					// `eventId` is read by the authorization layer to resolve which
					// event owns the guest BEFORE the rule below runs.
					eventId: guest.eventId,
					companionsLimit: guest.companionsLimit,
					_count: { companions: guest.companions.length },
					invitationGuests: guest.invitationGuests,
				});
			},
		},
		guestCompanion: {
			count: () => Promise.resolve(0),
			create: (args: {
				data: { guestId: string; name: string; status: string };
			}) => {
				createdCompanions.push({
					guestId: args.data.guestId,
					name: args.data.name,
				});
				return Promise.resolve({ id: "gcp_new", ...args.data });
			},
		},
		event: {
			// Only the invitation capacity rule reads the event row here.
			findUnique: () =>
				Promise.resolve({ maxGuestsPerInvitation: MAX_GUESTS_PER_INVITATION }),
		},
	};
}

vi.mock("@muxima/db", () => ({ default: buildDb() }));

vi.mock("../../modules/invitations/qr-code", () => ({
	buildInvitationQrPayload: vi.fn(() =>
		Promise.resolve({
			url: "http://localhost:3001/invite/X",
			qrCode: "<svg/>",
		}),
	),
	buildInvitationUrl: vi.fn(
		(code: string) => `http://localhost:3001/invite/${code}`,
	),
}));

vi.mock("@muxima/db/activity-log", () => ({
	createActivityLog: vi.fn(),
	buildChanges: () => [],
}));

vi.mock("@muxima/auth", () => ({
	BLOCKED_USER_MESSAGE: "blocked",
	getUserAccess: () =>
		Promise.resolve({
			roles: [
				{
					id: "OWNER",
					name: "Proprietário",
					permissions: ["event.access.all"],
				},
			],
			permissions: ["event.access.all"],
		}),
	hasPermission: (granted: readonly string[]) => granted.length > 0,
	PERMISSIONS: {},
	auth: {},
}));

/**
 * Authorization is stubbed, not exercised: this suite is about the invitation
 * capacity rule and the DECLINED-invitation companion rule, and it asserts on
 * THOSE rejections. Authorization has its own coverage, and letting the real
 * guards run here would only re-test that the caller holds `guests.create`.
 *
 * The stub replaces `authorization` — the module the routers actually import —
 * rather than `event-access` underneath it, so a router that starts calling a
 * new guard fails loudly instead of silently skipping authorization.
 */
vi.mock("../../shared/auth/authorization", () => ({
	requireEventPermission: vi.fn(() => Promise.resolve()),
	requireEventPermissionMutable: vi.fn(() => Promise.resolve()),
	getEventIdForResource: vi.fn((resource: string) =>
		Promise.resolve(resource === "guest" ? "evt_1" : null),
	),
	/**
	 * The non-nullable resolver. Kept in the stub rather than delegated to the
	 * real module so this suite keeps testing the rules it is named after, and
	 * so a router that adopts it does not fail with a missing export — which is
	 * exactly the failure mode the note above describes.
	 */
	requireEventIdForResource: vi.fn((resource: string) =>
		resource === "guest"
			? Promise.resolve("evt_1")
			: Promise.reject(new Error("unexpected resource")),
	),
}));

/**
 * Rate limiting is cross-cutting infra with its own coverage — this suite
 * asserts the invitation eligibility rule, not the throttle, so the limiter
 * is stubbed out here (same pattern as the auth/authorization stubs above).
 */
vi.mock("../../shared/auth/rate-limit", () => ({
	publicInvitationCodeLimiter: { check: vi.fn() },
	publicInvitationScheduleLimiter: { check: vi.fn() },
	publicInvitationRespondLimiter: { check: vi.fn() },
	publicInvitationExportLimiter: { check: vi.fn() },
	exportLimiter: { check: vi.fn() },
	publishLimiter: { check: vi.fn() },
	rateLimitKey: vi.fn((parts: Record<string, string>) =>
		[parts.endpoint, parts.method, parts.ip, parts.userId].join("|"),
	),
}));

const { call } = await import("@orpc/server");
const { invitationsRouter } = await import("../../routers/invitations");
const { guestsRouter } = await import("../../routers/guests");

const context = {
	session: { user: { id: "usr_admin" } },
	requestHeaders: new Headers(),
	userAgent: "vitest",
	ip: "10.0.0.1",
} as never;

beforeEach(() => {
	invitations = [makeInvitation()];
	guests = [makeGuest()];
	updatedInvitations = [];
	createdCompanions = [];
});

describe("invitations.public.respond — backend is the authority", () => {
	it("accepts a response while the invitation is responseable", async () => {
		const result = await call(
			invitationsRouter.public.respond,
			{ code: "MUX-ABCD-EFGH", response: "CONFIRM" },
			{ context },
		);

		expect(result.rsvpStatus).toBe("CONFIRMED");
		// The lookup may also persist the OPENED transition; the RSVP update is
		// the one that carries the new status.
		expect(
			updatedInvitations.some(
				(update) => update.data.rsvpStatus === "CONFIRMED",
			),
		).toBe(true);
	});

	it("blocks the response when the event is CANCELLED", async () => {
		invitations = [
			makeInvitation({
				event: { ...makeInvitation().event, status: "CANCELLED" },
			}),
		];

		await expect(
			call(
				invitationsRouter.public.respond,
				{ code: "MUX-ABCD-EFGH", response: "CONFIRM" },
				{ context },
			),
		).rejects.toThrow(/cancelado/);
		expect(updatedInvitations).toHaveLength(0);
	});

	it("blocks the response when the event is DRAFT", async () => {
		invitations = [
			makeInvitation({
				event: { ...makeInvitation().event, status: "DRAFT" },
			}),
		];

		await expect(
			call(
				invitationsRouter.public.respond,
				{ code: "MUX-ABCD-EFGH", response: "CONFIRM" },
				{ context },
			),
		).rejects.toThrow(/confirmado/);
		expect(updatedInvitations).toHaveLength(0);
	});

	it("blocks the response when the event is PLANNING", async () => {
		invitations = [
			makeInvitation({
				event: { ...makeInvitation().event, status: "PLANNING" },
			}),
		];

		await expect(
			call(
				invitationsRouter.public.respond,
				{ code: "MUX-ABCD-EFGH", response: "CONFIRM" },
				{ context },
			),
		).rejects.toThrow(/confirmado/);
		expect(updatedInvitations).toHaveLength(0);
	});

	it("blocks the response when the event is COMPLETED", async () => {
		invitations = [
			makeInvitation({
				event: { ...makeInvitation().event, status: "COMPLETED" },
			}),
		];

		await expect(
			call(
				invitationsRouter.public.respond,
				{ code: "MUX-ABCD-EFGH", response: "CONFIRM" },
				{ context },
			),
		).rejects.toThrow(/aconteceu/);
		expect(updatedInvitations).toHaveLength(0);
	});

	it("blocks the response when the event date has passed", async () => {
		invitations = [
			makeInvitation({
				event: {
					...makeInvitation().event,
					eventDate: new Date("2026-09-01T15:00:00.000Z"),
					endTime: "20:00",
				},
			}),
		];

		await expect(
			call(
				invitationsRouter.public.respond,
				{ code: "MUX-ABCD-EFGH", response: "CONFIRM" },
				{ context },
			),
		).rejects.toThrow(/aconteceu/);
		expect(updatedInvitations).toHaveLength(0);
	});

	it("treats an unknown code as NOT_FOUND (no enumeration)", async () => {
		await expect(
			call(
				invitationsRouter.public.respond,
				{ code: "MUX-ZZZZ-ZZZZ", response: "CONFIRM" },
				{ context },
			),
		).rejects.toThrow(/não encontrado/);
	});

	it("treats an unpublished invitation as NOT_FOUND", async () => {
		invitations = [makeInvitation({ publishedAt: null })];

		await expect(
			call(
				invitationsRouter.public.respond,
				{ code: "MUX-ABCD-EFGH", response: "CONFIRM" },
				{ context },
			),
		).rejects.toThrow(/não encontrado/);
	});

	it("exposes canRespond/rsvpBlockedReason on the public read", async () => {
		invitations = [
			makeInvitation({
				event: { ...makeInvitation().event, status: "CANCELLED" },
			}),
		];

		const lookup = await call(
			invitationsRouter.public.getByCode,
			{ code: "MUX-ABCD-EFGH" },
			{ context },
		);

		if (lookup.result !== "AVAILABLE") {
			throw new Error("expected AVAILABLE lookup");
		}
		expect(lookup.invitation.canRespond).toBe(false);
		expect(lookup.invitation.rsvpBlockedReason).toBe("EVENT_CANCELLED");
	});
});

describe("guests.addCompanion — DECLINED invitation rule", () => {
	it("allows adding a companion when the invitation is DECLINED", async () => {
		guests = [
			makeGuest({
				companionsLimit: 0,
				invitationGuests: [{ invitation: { rsvpStatus: "DECLINED" } }],
			}),
		];

		const companion = await call(
			guestsRouter.addCompanion,
			{ guestId: "gst_1", name: "Acompanhante" },
			{ context },
		);

		expect(companion.name).toBe("Acompanhante");
		expect(createdCompanions).toHaveLength(1);
	});

	it("keeps the companionsLimit rule for non-declined invitations", async () => {
		guests = [
			makeGuest({
				companionsLimit: 0,
				invitationGuests: [{ invitation: { rsvpStatus: "CONFIRMED" } }],
			}),
		];

		await expect(
			call(
				guestsRouter.addCompanion,
				{ guestId: "gst_1", name: "Acompanhante" },
				{ context },
			),
		).rejects.toThrow(/acompanhante/);
		expect(createdCompanions).toHaveLength(0);
	});

	it("enforces the limit with an existing companion (non-declined)", async () => {
		guests = [
			makeGuest({
				companionsLimit: 1,
				companions: [
					{
						id: "gcp_1",
						guestId: "gst_1",
						name: "Existente",
						status: "PENDING",
					},
				],
				invitationGuests: [{ invitation: { rsvpStatus: "PENDING" } }],
			}),
		];

		await expect(
			call(
				guestsRouter.addCompanion,
				{ guestId: "gst_1", name: "Outro" },
				{ context },
			),
		).rejects.toThrow(/acompanhante/);
		expect(createdCompanions).toHaveLength(0);
	});

	it("rejects an unknown guest", async () => {
		guests = [];

		await expect(
			call(
				guestsRouter.addCompanion,
				{ guestId: "gst_missing", name: "X" },
				{ context },
			),
		).rejects.toThrow(/não encontrado/);
	});

	it("derives the invitation state from the database, not the payload", async () => {
		// The input schema only carries guestId/name/status — there is no way
		// to claim a DECLINED state from the client. The database row decides.
		guests = [
			makeGuest({
				companionsLimit: 0,
				invitationGuests: [{ invitation: { rsvpStatus: "CONFIRMED" } }],
			}),
		];

		await expect(
			call(
				guestsRouter.addCompanion,
				{
					guestId: "gst_1",
					name: "Bypass",
					rsvpStatus: "DECLINED",
				} as never,
				{ context },
			),
		).rejects.toThrow(/acompanhante/);
	});
});
