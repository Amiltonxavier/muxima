import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Team-invitation claim flows, exercised through the real procedures so the
 * middleware chain and the Zod input schema run as in production.
 *
 * The security properties under test:
 *  - an opaque token must exist, belong to the invited e-mail, be unexpired
 *    and still be `PENDING`;
 *  - a token is single-use — accepting or declining twice is a replay and is
 *    rejected;
 *  - a membership race is reported as a conflict, never as a crash.
 */

// ── Database double ─────────────────────────────────────────────────

type InvitationRow = {
	id: string;
	eventId: string;
	email: string | null;
	role: string;
	token: string;
	status: string;
	expiresAt: Date;
	event: { name: string; status: string };
};

let invitations: InvitationRow[] = [];
let createdMembers: Record<string, unknown>[] = [];
let membershipRace = false;

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 60 * 1000);

function makeInvitation(overrides: Partial<InvitationRow> = {}): InvitationRow {
	return {
		id: "eiv_1",
		eventId: "evt_1",
		email: "convidado@x.com",
		role: "EDITOR",
		token: "tok_secure_abc",
		status: "PENDING",
		expiresAt: FUTURE,
		event: { name: "Casamento de Ana", status: "CONFIRMED" },
		...overrides,
	};
}

function buildDb() {
	return {
		// Session guard: the caller's account must exist and be ACTIVE.
		user: {
			findUnique: () => Promise.resolve({ status: "ACTIVE" }),
		},
		eventInvitation: {
			findFirst: (args: { where: { token?: string; id?: string } }) =>
				Promise.resolve(
					invitations.find(
						(inv) =>
							(args.where.token && inv.token === args.where.token) ||
							(args.where.id && inv.id === args.where.id),
					) ?? null,
				),
			findUnique: (args: { where: { id: string } }) =>
				Promise.resolve(
					invitations.find((inv) => inv.id === args.where.id) ?? null,
				),
			update: (args: {
				where: { id: string };
				data: Record<string, unknown>;
			}) => {
				const invitation = invitations.find((inv) => inv.id === args.where.id);
				if (invitation) Object.assign(invitation, args.data);
				return Promise.resolve(invitation);
			},
		},
		event: {
			findUnique: () =>
				Promise.resolve({ ownerId: "usr_owner", name: "Casamento de Ana" }),
		},
		notification: {
			create: (args: { data: Record<string, unknown> }) =>
				Promise.resolve({ id: "ntf_1", ...args.data }),
		},
		role: {
			findUnique: () => Promise.resolve({ id: "role_editor" }),
		},
		eventMember: {
			create: (args: { data: Record<string, unknown> }) => {
				if (membershipRace) {
					// Prisma unique-constraint violation (P2002).
					return Promise.reject(
						Object.assign(new Error("Unique constraint"), { code: "P2002" }),
					);
				}
				const member = {
					id: "mem_1",
					...(args.data as Record<string, unknown>),
				};
				createdMembers.push(member);
				return Promise.resolve(member);
			},
		},
		$transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(buildDb()),
	};
}

vi.mock("@muxima/db", () => ({ default: buildDb() }));
vi.mock("@muxima/auth", () => ({
	BLOCKED_USER_MESSAGE: "bloqueada",
}));

const { call } = await import("@orpc/server");
const { memberInvitesRouter } = await import("../member-invites");

// ── World ───────────────────────────────────────────────────────────

const INVITED = "convidado@x.com";

function contextFor(email: string | null) {
	return {
		session: email
			? { user: { id: "usr_claimer", email, name: "Convidado" } }
			: null,
		requestHeaders: new Headers({ cookie: "session=abc" }),
		userAgent: "vitest",
		ip: "10.0.0.1",
	} as never;
}

const accept = (token: string, email = INVITED) =>
	call(memberInvitesRouter.accept, { token }, { context: contextFor(email) });

const decline = (token: string, email = INVITED) =>
	call(memberInvitesRouter.decline, { token }, { context: contextFor(email) });

beforeEach(() => {
	invitations = [makeInvitation()];
	createdMembers = [];
	membershipRace = false;
});

describe("get (preview)", () => {
	it("describes the invitation without consuming it", async () => {
		const preview = await call(
			memberInvitesRouter.get,
			{ token: "tok_secure_abc" },
			{ context: contextFor(INVITED) },
		);

		expect(preview).toMatchObject({
			eventId: "evt_1",
			eventName: "Casamento de Ana",
			role: "EDITOR",
		});
		expect(preview.expiresAt.getTime()).toBeGreaterThan(Date.now());
		// Reading must never spend the token.
		expect(invitations[0]?.status).toBe("PENDING");
		expect(createdMembers).toHaveLength(0);
	});

	it("does not describe an invitation to another account", async () => {
		// No event name, no role: a foreign token leaks nothing.
		await expect(
			call(
				memberInvitesRouter.get,
				{ token: "tok_secure_abc" },
				{ context: contextFor("outro@x.com") },
			),
		).rejects.toMatchObject({ code: "MEMBER_INVITE_EMAIL_MISMATCH" });
	});
});

describe("accept", () => {
	it("joins the invitee to the event and consumes the token", async () => {
		const result = await accept("tok_secure_abc");

		expect(result.member).toMatchObject({
			eventId: "evt_1",
			userId: "usr_claimer",
			role: "EDITOR",
			status: "ACTIVE",
			roleId: "role_editor",
		});
		expect(result.eventName).toBe("Casamento de Ana");
		expect(invitations[0]?.status).toBe("ACCEPTED");
	});

	it("rejects an unknown token without leaking anything", async () => {
		await expect(accept("does-not-exist")).rejects.toMatchObject({
			code: "MEMBER_INVITE_NOT_FOUND",
		});
		expect(createdMembers).toHaveLength(0);
	});

	it("rejects a token claimed by a different account", async () => {
		// The token is bound to the invited e-mail: anyone holding the link
		// but signed in as someone else learns nothing.
		await expect(accept("tok_secure_abc", "outro@x.com")).rejects.toMatchObject(
			{
				code: "MEMBER_INVITE_EMAIL_MISMATCH",
			},
		);
		expect(invitations[0]?.status).toBe("PENDING");
		expect(createdMembers).toHaveLength(0);
	});

	it("rejects an expired invitation", async () => {
		invitations = [makeInvitation({ expiresAt: PAST })];

		await expect(accept("tok_secure_abc")).rejects.toMatchObject({
			code: "MEMBER_INVITE_EXPIRED",
		});
		expect(createdMembers).toHaveLength(0);
	});

	it("rejects an already-consumed token (replay)", async () => {
		invitations = [makeInvitation({ status: "ACCEPTED" })];

		await expect(accept("tok_secure_abc")).rejects.toMatchObject({
			code: "MEMBER_INVITE_ALREADY_USED",
		});
	});

	it("cannot be accepted twice — the second attempt is a replay", async () => {
		await accept("tok_secure_abc");

		await expect(accept("tok_secure_abc")).rejects.toMatchObject({
			code: "MEMBER_INVITE_ALREADY_USED",
		});
		expect(createdMembers).toHaveLength(1);
	});

	it("turns a membership race into a domain conflict", async () => {
		membershipRace = true;

		await expect(accept("tok_secure_abc")).rejects.toMatchObject({
			code: "EVENT_MEMBER_ALREADY_EXISTS",
		});
	});

	it("requires an authenticated caller", async () => {
		await expect(
			call(
				memberInvitesRouter.accept,
				{ token: "tok_secure_abc" },
				{ context: contextFor(null) },
			),
		).rejects.toThrow();
		expect(createdMembers).toHaveLength(0);
	});
});

describe("decline", () => {
	it("records the refusal and consumes the token", async () => {
		const result = await decline("tok_secure_abc");

		expect(result).toEqual({
			success: true,
			eventName: "Casamento de Ana",
		});
		expect(invitations[0]?.status).toBe("REJECTED");
		expect(createdMembers).toHaveLength(0);
	});

	it("cannot be replayed after the refusal", async () => {
		await decline("tok_secure_abc");

		await expect(accept("tok_secure_abc")).rejects.toMatchObject({
			code: "MEMBER_INVITE_ALREADY_USED",
		});
		expect(createdMembers).toHaveLength(0);
	});

	it("rejects an expired invitation", async () => {
		invitations = [makeInvitation({ expiresAt: PAST })];

		await expect(decline("tok_secure_abc")).rejects.toMatchObject({
			code: "MEMBER_INVITE_EXPIRED",
		});
		expect(invitations[0]?.status).toBe("PENDING");
	});
});
