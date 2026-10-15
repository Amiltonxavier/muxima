import { beforeEach, describe, expect, it, vi } from "vitest";
import { roleLabel, rolePermissionLabels } from "../../shared/mail";

/**
 * E-mail wiring of the business operations.
 *
 * Every flow below is executed through the real oRPC procedure (schemas +
 * middleware included) with the database and the mailer doubled, so the
 * assertions pin down *which* mail is sent, *to whom* and with *which CTA* —
 * the contract between the domain and `@muxima/mail`.
 *
 * Delivery itself is covered by `@muxima/mail`'s own tests; here the mail
 * methods resolve `{ ok: false }` on purpose to prove that a failing SMTP can
 * never fail the business operation.
 */

// ── Doubles ─────────────────────────────────────────────────────────

const sent: { method: string; input: Record<string, unknown> }[] = [];

function track(method: string) {
	return vi.fn((input: Record<string, unknown>) => {
		sent.push({ method, input });
		// A dead SMTP must not be able to fail the operation under test.
		return Promise.resolve({
			ok: false as const,
			code: "SMTP_FAILED" as const,
		});
	});
}

vi.mock("@muxima/mail", () => ({
	MailService: {
		sendEventInvitation: track("sendEventInvitation"),
		sendMemberInvitation: track("sendMemberInvitation"),
		sendOtp: track("sendOtp"),
		sendPasswordChanged: track("sendPasswordChanged"),
		sendAccountBlocked: track("sendAccountBlocked"),
		sendAccountUnblocked: track("sendAccountUnblocked"),
		sendBudgetChanged: track("sendBudgetChanged"),
		sendPermissionsChanged: track("sendPermissionsChanged"),
		sendOwnershipChanged: track("sendOwnershipChanged"),
	},
}));

/** Values the mail assertions rely on. */
const BASE_URL = "http://localhost:3001";
const EVENT_ID = "evt_1";

let budgetRow: { plannedAmount: number; reserveAmount: number } | null;
let publishedAt: Date | null;
let memberRole = "EDITOR";

function buildDb() {
	return {
		user: {
			// The transfer reads the target and the previous owner by id.
			findUnique: (args?: { where?: { id?: string } }) => {
				const id = args?.where?.id;
				return Promise.resolve(
					id === "usr_target"
						? { id, name: "Novo Dono", email: "novo@x.com" }
						: {
								id: id ?? "usr_actor",
								name: "Ana",
								email: "ana@x.com",
							},
				);
			},
		},
		event: {
			findUnique: () =>
				Promise.resolve({
					name: "Casamento de Ana",
					ownerId: "usr_owner",
				}),
			update: () => Promise.resolve({ id: EVENT_ID, ownerId: "usr_target" }),
		},
		eventMember: {
			// `inviteMember` looks the invitee up through the user relation;
			// `transferOwnership` looks the target up by id — different shapes,
			// so the row is resolved from the shape of `where`.
			findFirst: (args: { where: Record<string, unknown> }) =>
				Promise.resolve(
					"user" in args.where ? null : { id: "mem_target", eventId: EVENT_ID },
				),
			findUnique: (args: { select?: Record<string, unknown> }) => {
				if (args.select?.user) {
					return Promise.resolve({
						user: { email: "membro@x.com", name: "Membro" },
					});
				}
				if (args.select?.id) return Promise.resolve({ id: "mem_owner" });
				return Promise.resolve({
					id: "mem_1",
					eventId: EVENT_ID,
					role: memberRole,
				});
			},
			findMany: () =>
				Promise.resolve([
					{ user: { email: "a@x.com", name: "A" } },
					{ user: { email: "b@x.com", name: "B" } },
					// Members without an e-mail are silently skipped.
					{ user: { email: null, name: "Sem Email" } },
				]),
			update: () => Promise.resolve({ id: "mem_1" }),
		},
		eventInvitation: {
			findFirst: () => Promise.resolve(null),
			create: (args: { data: Record<string, unknown> }) =>
				Promise.resolve({ id: "eiv_1", ...args.data }),
		},
		notification: {
			create: (args: { data: Record<string, unknown> }) =>
				Promise.resolve({ id: "ntf_1", ...args.data }),
		},
		role: {
			findUnique: (args: { where: { name: string } }) =>
				Promise.resolve({ id: `role_${args.where.name}` }),
		},
		budget: {
			findUnique: () => Promise.resolve(budgetRow),
			upsert: (args: { create: Record<string, unknown> }) =>
				Promise.resolve({
					notes: null,
					...args.create,
				}),
		},
		guestInvitation: {
			findUnique: () => Promise.resolve({ publishedAt }),
			findMany: (args: { where: { id: { in: string[] } } }) =>
				Promise.resolve(
					args.where.id.in.map((id) => ({
						id,
						code: "MUX-ABCD-EFGH",
						url: null,
						event: { name: "Casamento de Ana", eventDate: null },
						guests: [
							{ guest: { name: "João", email: "joao@x.com" } },
							{ guest: { name: "Sem Email", email: null } },
						],
					})),
				),
		},
		$transaction: (arg: unknown) =>
			typeof arg === "function"
				? (arg as (tx: unknown) => Promise<unknown>)(buildDb())
				: Promise.all(arg as Promise<unknown>[]),
	};
}

vi.mock("@muxima/db", () => ({ default: buildDb() }));
vi.mock("@muxima/db/activity-log", () => ({
	createActivityLog: vi.fn(() => Promise.resolve()),
	buildChanges: () => [],
}));
vi.mock("@muxima/auth", () => ({
	BLOCKED_USER_MESSAGE: "bloqueada",
}));

vi.mock("../../shared/auth/authorization", () => ({
	requireEventPermission: vi.fn(() => Promise.resolve()),
	requireEventPermissionMutable: vi.fn(() => Promise.resolve()),
	getEventPermissions: vi.fn(() => Promise.resolve([])),
	// Only the current OWNER may transfer ownership.
	getEventRole: vi.fn(() => Promise.resolve("OWNER")),
}));

vi.mock("../../modules/members/repository", () => ({
	MemberRepository: {
		updateRole: vi.fn((id: string, role: string) =>
			Promise.resolve({ id, role }),
		),
	},
}));

vi.mock("../../modules/invitations/service", () => ({
	canRespondToInvitation: vi.fn(),
	createInvitation: vi.fn(),
	generateInvitationCode: vi.fn(() => "MUX-ABCD-EFGH"),
	getInvitationById: vi.fn(),
	getInvitationStats: vi.fn(),
	getPublicInvitation: vi.fn(),
	getPublicSchedule: vi.fn(),
	listInvitations: vi.fn(),
	publishInvitation: vi.fn(() =>
		Promise.resolve({ id: "ginv_1", code: "MUX-ABCD-EFGH" }),
	),
	publishInvitationsBatch: vi.fn(() =>
		Promise.resolve({
			results: [{ invitationId: "ginv_1", status: "PUBLISHED" }],
		}),
	),
	respondToInvitation: vi.fn(),
	unpublishInvitation: vi.fn(),
}));

const { call } = await import("@orpc/server");
const { usersRouter } = await import("../users");
const { membersRouter } = await import("../members");
const { budgetRouter } = await import("../budget");
const { eventsRouter } = await import("../events");
const { invitationsRouter } = await import("../invitations");

// ── World ───────────────────────────────────────────────────────────

function contextFor(userId = "usr_owner") {
	return {
		session: { user: { id: userId, email: "owner@x.com", name: "Ana" } },
		requestHeaders: new Headers({ cookie: "session=abc" }),
		userAgent: "vitest",
		ip: "10.0.0.1",
	} as never;
}

function mailsOf(method: string) {
	return sent.filter((entry) => entry.method === method);
}

beforeEach(() => {
	sent.length = 0;
	budgetRow = null;
	publishedAt = null;
	memberRole = "EDITOR";
});

describe("users.inviteMember", () => {
	it("sends the member invitation with accept/decline links to the invitee", async () => {
		await call(
			usersRouter.inviteMember,
			{ eventId: EVENT_ID, email: "novo@x.com", role: "EDITOR" },
			{ context: contextFor() },
		);

		const [mail] = mailsOf("sendMemberInvitation");
		expect(mail).toBeDefined();
		expect(mail?.input).toMatchObject({
			to: "novo@x.com",
			eventName: "Casamento de Ana",
			roleLabel: roleLabel("EDITOR"),
			expiresInDays: 7,
		});

		const acceptUrl = String(mail?.input.acceptUrl);
		const declineUrl = String(mail?.input.declineUrl);
		// The CTA must point at the member-invite page with the opaque token —
		// absolute, so it works from any mail client.
		expect(acceptUrl).toMatch(
			/^http:\/\/localhost:3001\/invite\/member\/[A-Za-z0-9_-]{43}$/,
		);
		expect(declineUrl).toBe(`${acceptUrl}?respond=decline`);
	});

	it("stores a cryptographically secure, single-purpose token", async () => {
		const created: {
			token?: string;
			email?: string;
			expiresAt?: Date;
		}[] = [];
		const db = (await import("@muxima/db")).default as unknown as {
			eventInvitation: {
				create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
			};
		};
		const original = db.eventInvitation.create;
		db.eventInvitation.create = (args) => {
			created.push(args.data as (typeof created)[number]);
			return original(args);
		};

		await call(
			usersRouter.inviteMember,
			{ eventId: EVENT_ID, email: "novo@x.com", role: "VIEWER" },
			{ context: contextFor() },
		);

		const [invitation] = created;
		// 32 random bytes, base64url — not guessable, not sequential.
		expect(invitation?.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		// …bound to the invited address and to a short, fixed expiry.
		expect(invitation?.email).toBe("novo@x.com");
		const ttl = (invitation?.expiresAt?.getTime() ?? 0) - Date.now();
		expect(ttl).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
		expect(ttl).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
	});
});

describe("members.updateRole", () => {
	it("informs the member of the permissions the new role grants", async () => {
		await call(
			membersRouter.updateRole,
			{ memberId: "mem_1", role: "ADMIN" },
			{ context: contextFor() },
		);

		const [mail] = mailsOf("sendPermissionsChanged");
		expect(mail).toBeDefined();
		expect(mail?.input).toMatchObject({
			to: "membro@x.com",
			name: "Membro",
			eventName: "Casamento de Ana",
			roleLabel: roleLabel("ADMIN"),
			permissionLabels: rolePermissionLabels("ADMIN"),
			eventUrl: `${BASE_URL}/events/${EVENT_ID}`,
		});
		expect(mailsOf("sendPermissionsChanged")).toHaveLength(1);
	});
});

describe("budget.updateTarget", () => {
	it("notifies every other active member of the new numbers", async () => {
		await call(
			budgetRouter.updateTarget,
			{ eventId: EVENT_ID, plannedAmount: 1_250_000, reserveAmount: 50_000 },
			{ context: contextFor("usr_actor") },
		);

		const mails = mailsOf("sendBudgetChanged");
		expect(mails.map((m) => m.input.to).sort()).toEqual(["a@x.com", "b@x.com"]);
		expect(mails[0]?.input).toMatchObject({
			eventName: "Casamento de Ana",
			actorName: "Ana",
			plannedCents: 125_000_000,
			reserveCents: 5_000_000,
			budgetUrl: `${BASE_URL}/events/${EVENT_ID}/budget`,
		});
	});

	it("does not mail anyone when only the notes changed", async () => {
		// Same numbers as stored — only `notes` moves.
		budgetRow = { plannedAmount: 125_000, reserveAmount: 5_000 };

		await call(
			budgetRouter.updateTarget,
			{
				eventId: EVENT_ID,
				plannedAmount: 125_000,
				reserveAmount: 5_000,
				notes: "rever fornecedores",
			},
			{ context: contextFor("usr_actor") },
		);

		expect(mailsOf("sendBudgetChanged")).toHaveLength(0);
	});
});

describe("events.transferOwnership", () => {
	it("informs the new owner and the previous one", async () => {
		await call(
			eventsRouter.transferOwnership,
			{ eventId: EVENT_ID, toUserId: "usr_target" },
			{ context: contextFor("usr_owner") },
		);

		const mails = mailsOf("sendOwnershipChanged");
		expect(mails).toHaveLength(2);

		const newOwner = mails.find((m) => m.input.isNewOwner === true);
		const previousOwner = mails.find((m) => m.input.isNewOwner === false);

		expect(newOwner?.input).toMatchObject({
			to: "novo@x.com",
			name: "Novo Dono",
			eventName: "Casamento de Ana",
			previousOwnerName: "Ana",
			eventUrl: `${BASE_URL}/events/${EVENT_ID}`,
		});
		expect(previousOwner?.input).toMatchObject({
			to: "ana@x.com",
			name: "Ana",
			eventName: "Casamento de Ana",
			newOwnerName: "Novo Dono",
		});
	});
});

describe("invitations.publish", () => {
	it("e-mails every guest with a public link to the invitation", async () => {
		await call(
			invitationsRouter.publish,
			{ eventId: EVENT_ID, invitationId: "ginv_1" },
			{ context: contextFor() },
		);

		const mails = mailsOf("sendEventInvitation");
		expect(mails).toHaveLength(1);
		expect(mails[0]?.input).toMatchObject({
			to: "joao@x.com",
			guestName: "João",
			eventName: "Casamento de Ana",
			inviteUrl: `${BASE_URL}/invite/MUX-ABCD-EFGH`,
		});
	});

	it("does not mail anyone when the invitation was already public", async () => {
		publishedAt = new Date("2026-01-01T00:00:00.000Z");

		await call(
			invitationsRouter.publish,
			{ eventId: EVENT_ID, invitationId: "ginv_1" },
			{ context: contextFor() },
		);

		expect(mailsOf("sendEventInvitation")).toHaveLength(0);
	});
});

describe("invitations.publishBatch", () => {
	it("e-mails every guest of the invitations actually published", async () => {
		await call(
			invitationsRouter.publishBatch,
			{ eventId: EVENT_ID, invitationIds: ["ginv_1"] },
			{ context: contextFor() },
		);

		const mails = mailsOf("sendEventInvitation");
		expect(mails).toHaveLength(1);
		expect(mails[0]?.input).toMatchObject({
			to: "joao@x.com",
			guestName: "João",
			eventName: "Casamento de Ana",
			inviteUrl: `${BASE_URL}/invite/MUX-ABCD-EFGH`,
		});
	});
});

describe("users.updateMemberRole", () => {
	it("informs the member of the permissions their new role grants", async () => {
		await call(
			usersRouter.updateMemberRole,
			{ id: "mem_1", role: "ADMIN" },
			{ context: contextFor() },
		);

		const mails = mailsOf("sendPermissionsChanged");
		expect(mails).toHaveLength(1);
		expect(mails[0]?.input).toMatchObject({
			to: "membro@x.com",
			name: "Membro",
			eventName: "Casamento de Ana",
			roleLabel: roleLabel("ADMIN"),
			permissionLabels: rolePermissionLabels("ADMIN"),
			eventUrl: `${BASE_URL}/events/${EVENT_ID}`,
		});
	});
});
