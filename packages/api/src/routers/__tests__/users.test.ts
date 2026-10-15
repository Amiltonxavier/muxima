import { APIError } from "better-auth/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Profile and password endpoints, exercised through the real procedures so the
 * middleware chain and the shared password policy run as in production.
 */

// ── Doubles ───────────────────────────────────────────────────────

const userRow = {
	id: "usr_1",
	name: "Ana",
	email: "ana@x.com",
	phone: "+351900000000",
	emailVerified: true,
	image: null,
	role: "USER",
	status: "ACTIVE",
	createdAt: new Date("2025-01-01T00:00:00.000Z"),
	updatedAt: new Date("2025-01-02T00:00:00.000Z"),
};

let access: { roles: unknown[]; permissions: string[] };
let activityLogs: unknown[];
let counts: {
	activeSessions: number;
	ownedEvents: number;
	memberships: number;
};

/**
 * Indirection so each test can swap the Better Auth behaviour. The mock factory
 * runs at import time — before `beforeEach` — so it cannot close over a
 * reassigned `vi.fn` directly; it resolves the current one when called instead.
 */
const changePasswordRef: { current: ReturnType<typeof vi.fn<ProcedureFn>> } = {
	current: vi.fn<ProcedureFn>(),
};

type ProcedureFn = (args: {
	body: Record<string, unknown>;
	headers: Headers;
}) => unknown;

vi.mock("@muxima/db", () => ({
	default: {
		user: {
			findUnique: (args: { select?: { status?: boolean } }) =>
				Promise.resolve(
					// The blocked-account guard selects only `status`; the profile
					// read selects the full row.
					args.select?.status ? { status: "ACTIVE" } : userRow,
				),
			update: ({ data }: { data: Record<string, unknown> }) =>
				Promise.resolve({ ...userRow, ...data }),
		},
		session: { count: () => Promise.resolve(counts.activeSessions) },
		event: { count: () => Promise.resolve(counts.ownedEvents) },
		eventMember: { count: () => Promise.resolve(counts.memberships) },
	},
}));

vi.mock("@muxima/auth", () => ({
	BLOCKED_USER_MESSAGE: "blocked",
	getUserAccess: () => Promise.resolve(access),
	auth: {
		api: { changePassword: (args: never) => changePasswordRef.current(args) },
	},
	hasPermission: (granted: readonly string[], permission: string) =>
		granted.includes(permission),
	PERMISSIONS: { PROFILE_PASSWORD_CHANGE: "profile.password.change" },
}));

const recordActivity = vi.fn();
vi.mock("@muxima/db/activity-log", () => ({
	createActivityLog: (input: unknown) => {
		recordActivity(input);
		return Promise.resolve();
	},
	buildChanges: (
		previous: Record<string, unknown>,
		next: Record<string, unknown>,
		fields: readonly string[],
	) =>
		fields
			.filter((field) => previous[field] !== next[field])
			.map((field) => ({
				field,
				before: previous[field],
				after: next[field],
			})),
}));

vi.mock("../../modules/users/service", () => ({
	UserService: {
		updateProfile: (userId: string, data: Record<string, unknown>) =>
			Promise.resolve({ ...userRow, id: userId, ...data }),
		blockAccount: vi.fn((userId: string, reason?: string) =>
			Promise.resolve({
				user: { ...userRow, id: userId, status: "BLOCKED" },
				revokedSessions: 3,
				reason,
			}),
		),
		unblockAccount: (userId: string) =>
			Promise.resolve({ ...userRow, id: userId, status: "ACTIVE" }),
	},
	profileSelect: {},
}));

/**
 * The mail layer is a dependency of these handlers, but the tests assert the
 * *wiring* (which mail, with which data) — never real SMTP. The doubles also
 * keep the suite from dialling Ethereal on every password change.
 */
vi.mock("@muxima/mail", () => {
	const stub = () => vi.fn(() => Promise.resolve({ ok: true as const }));
	return {
		MailService: {
			sendPasswordChanged: stub(),
			sendAccountBlocked: stub(),
			sendAccountUnblocked: stub(),
		},
	};
});

vi.mock("../../shared/auth/event-access", () => ({
	requireEventAccess: vi.fn(),
	requireEventMutable: vi.fn(),
}));

const { call } = await import("@orpc/server");
const { usersRouter } = await import("../users");
const { MailService } = await import("@muxima/mail");

const sendPasswordChanged = vi.mocked(MailService.sendPasswordChanged);
const sendAccountBlocked = vi.mocked(MailService.sendAccountBlocked);
const sendAccountUnblocked = vi.mocked(MailService.sendAccountUnblocked);

// ── World ─────────────────────────────────────────────────────────

const CALLER = "usr_1";

function contextFor(userId: string | null) {
	return {
		// The session user carries the same fields Better Auth puts there —
		// the security e-mails address the account by them.
		session: userId
			? { user: { id: userId, email: "ana@x.com", name: "Ana" } }
			: null,
		requestHeaders: new Headers({ cookie: "session=abc" }),
		userAgent: "vitest",
		ip: "10.0.0.1",
	} as never;
}

const getProfile = () =>
	call(usersRouter.getProfile, {}, { context: contextFor(CALLER) });

type ChangePasswordInput = {
	currentPassword: string;
	newPassword: string;
	confirmNewPassword: string;
};

const changePasswordOf = (input: ChangePasswordInput) =>
	call(usersRouter.changePassword, input, { context: contextFor(CALLER) });

const VALID_PASSWORD: ChangePasswordInput = {
	currentPassword: "Antiga123",
	newPassword: "Nova1234",
	confirmNewPassword: "Nova1234",
};

beforeEach(() => {
	access = { roles: [], permissions: [] };
	counts = { activeSessions: 2, ownedEvents: 1, memberships: 3 };
	activityLogs = [];
	recordActivity.mockClear();
	sendPasswordChanged.mockClear();
	sendAccountBlocked.mockClear();
	sendAccountUnblocked.mockClear();
	changePasswordRef.current = vi.fn<ProcedureFn>(() =>
		Promise.resolve({ success: true }),
	);
});

describe("getProfile", () => {
	it("returns the caller's own profile with roles and permissions", async () => {
		access = {
			roles: [
				{ id: "OWNER", name: "Proprietário", permissions: ["event.delete"] },
			],
			permissions: ["activity.read", "event.delete"],
		};

		const profile = await getProfile();

		expect(profile).toMatchObject({
			id: CALLER,
			name: "Ana",
			email: "ana@x.com",
			emailVerified: true,
			security: { emailVerified: true, activeSessions: 2 },
			activity: { ownedEvents: 1, eventMemberships: 3 },
		});
		expect(profile.roles).toEqual(access.roles);
		expect(profile.permissions).toEqual(access.permissions);
	});

	it("resolves roles from the same source the session uses", async () => {
		// Not a client-side guess: the endpoint reports what the server derived.
		access = {
			roles: [{ id: "VIEWER", name: "Visualizador", permissions: [] }],
			permissions: ["activity.read"],
		};

		const profile = await getProfile();

		expect(profile.permissions).toEqual(["activity.read"]);
	});

	it("rejects an unauthenticated caller", async () => {
		await expect(
			call(usersRouter.getProfile, {}, { context: contextFor(null) }),
		).rejects.toThrow();
	});

	it("returns no access for a user without event membership", async () => {
		const profile = await getProfile();

		expect(profile.roles).toEqual([]);
		expect(profile.permissions).toEqual([]);
	});
});

describe("changePassword", () => {
	it("changes the password and reports success", async () => {
		await expect(changePasswordOf(VALID_PASSWORD)).resolves.toEqual({
			success: true,
		});

		expect(changePasswordRef.current).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.objectContaining({
					currentPassword: "Antiga123",
					newPassword: "Nova1234",
				}),
			}),
		);
	});

	it("revokes the caller's other sessions", async () => {
		// A stolen token must stop working the moment the password changes.
		await changePasswordOf(VALID_PASSWORD);

		expect(changePasswordRef.current).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.objectContaining({ revokeOtherSessions: true }),
			}),
		);
	});

	it("forwards the caller's own request headers", async () => {
		// Better Auth verifies the current password against the caller's session,
		// which it reads from these headers.
		await changePasswordOf(VALID_PASSWORD);

		expect(changePasswordRef.current).toHaveBeenCalledWith(
			expect.objectContaining({ headers: expect.any(Headers) }),
		);
	});

	it("rejects a mismatched confirmation", async () => {
		// oRPC reports Zod failures as `data.issues`, so the actionable message
		// (and which field caused it) is asserted through that shape.
		let caught:
			| { data?: { issues?: { path: unknown[]; message: string }[] } }
			| undefined;
		try {
			await changePasswordOf({
				...VALID_PASSWORD,
				confirmNewPassword: "Outra1234",
			});
		} catch (error) {
			caught = error as typeof caught;
		}

		expect(caught?.data?.issues).toEqual([
			expect.objectContaining({
				path: ["confirmNewPassword"],
				message: expect.stringMatching(/não coincidem/i),
			}),
		]);
		expect(changePasswordRef.current).not.toHaveBeenCalled();
	});

	it.each([
		["too short", "Ab1"],
		["no uppercase", "abcdefg1"],
		["no lowercase", "ABCDEFG1"],
		["no digit", "Abcdefgh"],
	])("rejects a new password that is %s", async (_label, newPassword) => {
		await expect(
			changePasswordOf({
				...VALID_PASSWORD,
				newPassword,
				confirmNewPassword: newPassword,
			}),
		).rejects.toThrow();
		expect(changePasswordRef.current).not.toHaveBeenCalled();
	});

	it("rejects an empty current password", async () => {
		await expect(
			changePasswordOf({ ...VALID_PASSWORD, currentPassword: "" }),
		).rejects.toThrow();
	});

	it("rejects an unauthenticated caller", async () => {
		await expect(
			call(usersRouter.changePassword, VALID_PASSWORD, {
				context: contextFor(null),
			}),
		).rejects.toThrow();
		expect(changePasswordRef.current).not.toHaveBeenCalled();
	});

	it("surfaces a wrong current password as a clear error", async () => {
		changePasswordRef.current = vi.fn<ProcedureFn>(() => {
			throw new APIError("BAD_REQUEST", {
				message: "Invalid email or password",
			});
		});

		await expect(changePasswordOf(VALID_PASSWORD)).rejects.toThrow(
			/atual está incorreta/i,
		);
	});

	it("does not log either password", async () => {
		await changePasswordOf(VALID_PASSWORD);

		activityLogs = recordActivity.mock.calls.map(([input]) => input);
		const serialized = JSON.stringify(activityLogs);

		expect(serialized).not.toContain("Antiga123");
		expect(serialized).not.toContain("Nova1234");
		expect(changePasswordRef.current).toHaveBeenCalledTimes(1);
	});

	it("records the change in the activity trail", async () => {
		await changePasswordOf(VALID_PASSWORD);

		expect(recordActivity).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: CALLER,
				action: "PASSWORD_CHANGED",
				resource: "PROFILE",
			}),
		);
	});

	it("sends the security alert to the account's own e-mail", async () => {
		await changePasswordOf(VALID_PASSWORD);

		expect(sendPasswordChanged).toHaveBeenCalledWith({
			to: "ana@x.com",
			name: "Ana",
			at: expect.any(Date),
			ip: "10.0.0.1",
		});
	});

	it("completes the change even when the e-mail cannot be delivered", async () => {
		// Mail is never critical to the operation: a delivery failure is a
		// result, not an exception, and must not roll the change back.
		sendPasswordChanged.mockResolvedValueOnce({
			ok: false,
			code: "SMTP_FAILED",
		});

		await expect(changePasswordOf(VALID_PASSWORD)).resolves.toEqual({
			success: true,
		});
	});
});

describe("blockAccount / unblockAccount", () => {
	type BlockInput = { confirm: true; reason?: string };

	const block = (input: BlockInput) =>
		call(usersRouter.blockAccount, input, { context: contextFor(CALLER) });
	const unblock = () =>
		call(usersRouter.unblockAccount, {}, { context: contextFor(CALLER) });

	it("notifies the user that the account was blocked", async () => {
		const result = await block({
			confirm: true,
			reason: "Pedido do titular",
		});

		expect(result.success).toBe(true);
		expect(result.revokedSessions).toBe(3);
		expect(sendAccountBlocked).toHaveBeenCalledWith({
			to: "ana@x.com",
			reason: "Pedido do titular",
		});
	});

	it("sends the notification after the block is already persisted", async () => {
		// Ordering matters: delivery may fail, but the account must be locked
		// regardless — so the block happens before the mail is awaited.
		const order: string[] = [];
		sendAccountBlocked.mockImplementationOnce(async () => {
			order.push("mail");
			return { ok: false, code: "SMTP_FAILED" };
		});
		const { UserService } = await import("../../modules/users/service");
		vi.mocked(UserService.blockAccount).mockImplementationOnce(async () => {
			order.push("block");
			return {
				user: { ...userRow, status: "BLOCKED" },
				revokedSessions: 3,
			} as never;
		});

		await expect(block({ confirm: true })).resolves.toMatchObject({
			success: true,
		});
		expect(order).toEqual(["block", "mail"]);
	});

	it("requires an explicit confirmation", async () => {
		await expect(
			call(usersRouter.blockAccount, {} as BlockInput, {
				context: contextFor(CALLER),
			}),
		).rejects.toThrow();
		expect(sendAccountBlocked).not.toHaveBeenCalled();
	});

	it("notifies the user that the account was unblocked", async () => {
		await expect(unblock()).resolves.toMatchObject({ success: true });
		expect(sendAccountUnblocked).toHaveBeenCalledWith({
			to: "ana@x.com",
			name: "Ana",
		});
	});

	it("keeps the account usable when the unblock e-mail fails", async () => {
		sendAccountUnblocked.mockResolvedValueOnce({
			ok: false,
			code: "SMTP_NOT_CONFIGURED",
		});

		await expect(unblock()).resolves.toMatchObject({ success: true });
	});
});
