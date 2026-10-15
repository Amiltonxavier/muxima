import {
	getRolePermissions,
	isAccessRoleId,
	PERMISSIONS,
	type Permission,
} from "@muxima/permissions";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Ownership, end to end through the REAL guards.
 *
 * The default `USER` role (assigned at sign-up) grants `events.create`, and
 * creating an event is what writes the caller's `OWNER` membership. Neither
 * half may leak into someone else's event, so these tests pin both sides of
 * the contract:
 *
 * - a brand-new user creates THEIR event, and the write persists the
 *   membership with the `Role` FK (`roleId`) — the row authorization reads;
 * - a user without `events.create` gets a 403 before anything is written;
 * - `getEventPermissions` / `requireEventPermission` answer ONLY from the
 *   membership of that one event: the account-level role (even an
 *   administratively-named one) never opens another author's event.
 *
 * The database is the only double; the middleware chain (`requireAuth` →
 * `requireActiveUser`), the routers and `@muxima/auth`'s resolver are real.
 */

type Membership = {
	id: string;
	eventId: string;
	userId: string;
	role: string;
	status: string;
};

let memberships: Membership[] = [];
/** `userId → account-level role name` (`user.roleId → Role.name`). */
let accountRoles: Record<string, string | null> = {};
let createdEvents: { ownerId: string; name: string; status?: string }[] = [];
let memberWrites: Record<string, unknown>[] = [];

/** Serves `RolePermission` rows the way the join the resolver asks for. */
function grantsFor(role: string) {
	if (!isAccessRoleId(role)) return [];
	return getRolePermissions(role).map((key) => ({
		permission: { key: key as Permission },
	}));
}

/** Applies a flat `where` — the subset these queries build. */
function matches(
	row: Record<string, unknown>,
	where: Record<string, unknown> | undefined,
): boolean {
	if (!where) return true;

	return Object.entries(where).every(([key, condition]) => {
		// The IDOR guard lives here: `userId` in the `where` is what stops the
		// cross-account access, so the double honours it rather than assuming it.
		return row[key] === condition;
	});
}

const db = {
	user: {
		// One row answers both readers: `requireActiveUser` selects `status`,
		// `resolveAccountRole` selects `role`.
		findUnique: (args: { where: { id: string } }) => {
			const name = accountRoles[args.where.id] ?? "USER";
			return Promise.resolve({
				status: "ACTIVE",
				role: name === null ? null : { name },
			});
		},
	},
	eventMember: {
		findFirst: (args: { where: Record<string, unknown> }) =>
			Promise.resolve(memberships.find((m) => matches(m, args.where)) ?? null),
		findMany: (args: { where: Record<string, unknown> }) =>
			Promise.resolve(memberships.filter((m) => matches(m, args.where))),
		create: (args: { data: Record<string, unknown> }) => {
			memberWrites.push(args.data);
			return Promise.resolve(args.data);
		},
	},
	// Both shapes are exercised: the account-level resolver sends
	// `name: { in: [...] }`, the event-level resolver sends `name: role`.
	rolePermission: {
		findMany: (args: {
			where: { role: { name: string | { in: string[] } } };
		}) => {
			const name = args.where.role.name;
			const names = typeof name === "string" ? [name] : name.in;
			return Promise.resolve(names.flatMap((role) => grantsFor(role)));
		},
	},
	role: {
		findUnique: (args: { where: { name: string } }) =>
			Promise.resolve({ id: `rol_${args.where.name}` }),
	},
	event: {
		findUnique: (args: { where: { id: string } }) =>
			Promise.resolve(
				args.where.id === "evt_1" || args.where.id === "evt_2"
					? { id: args.where.id, status: "PLANNING" }
					: null,
			),
		create: (args: { data: { ownerId: string; name: string } }) => {
			createdEvents.push(args.data);
			return Promise.resolve({
				id: "evt_created",
				status: "DRAFT",
				...args.data,
			});
		},
	},
};

vi.mock("@muxima/db", () => ({
	default: db,
	createPrismaClient: () => db,
}));

vi.mock("@muxima/db/activity-log", () => ({
	createActivityLog: vi.fn(),
	buildChanges: () => [],
}));

const { call } = await import("@orpc/server");
const { eventsRouter } = await import("../../../routers/events");
const { getEventPermissions, requireEventPermission } = await import(
	"../authorization"
);

/** Builds a `call` options bag for a given caller. */
function ctx(userId: string) {
	return {
		context: {
			session: { user: { id: userId } },
			requestHeaders: new Headers(),
			userAgent: "vitest",
			ip: "10.0.0.1",
		},
	} as never;
}

const NEW_EVENT = {
	name: "Casamento Ana & Bruno",
	type: "WEDDING" as const,
	startTime: "15:00",
	endTime: "23:00",
};

async function expectRejection(
	run: Promise<unknown>,
	expected: { code: string; status: number },
): Promise<void> {
	await expect(run).rejects.toMatchObject({
		code: expected.code,
		status: expected.status,
	});
}

/**
 * The same assertion for the raw guards (no router in between): the shared
 * `AppError` carries `statusCode`, and the error mapper only later turns it
 * into the oRPC envelope's `status`.
 */
async function expectGuardRejection(
	run: Promise<unknown>,
	code: string,
): Promise<void> {
	await expect(run).rejects.toMatchObject({ code, statusCode: 403 });
}

beforeEach(() => {
	memberships = [
		{
			id: "mem_owner",
			eventId: "evt_1",
			userId: "usr_owner",
			role: "OWNER",
			status: "ACTIVE",
		},
		{
			id: "mem_pending",
			eventId: "evt_1",
			userId: "usr_pending",
			role: "VIEWER",
			status: "PENDING",
		},
	];
	accountRoles = {};
	createdEvents = [];
	memberWrites = [];
});

// ── Sign-up role → create your own event ─────────────────────────

describe("creating your own event with the default USER role", () => {
	it("lets a brand-new user create an event and persists the OWNER membership with its Role FK", async () => {
		// `usr_new` has no memberships at all — only the account role the
		// sign-up hook assigns (the double defaults every user to `USER`).
		await call(eventsRouter.create, NEW_EVENT, ctx("usr_new"));

		expect(createdEvents).toEqual([
			expect.objectContaining({ ownerId: "usr_new" }),
		]);
		// The membership authorization reads is written with the RESOLVED
		// `Role` row id, not just the enum label.
		expect(memberWrites).toEqual([
			expect.objectContaining({
				eventId: "evt_created",
				userId: "usr_new",
				role: "OWNER",
				status: "ACTIVE",
				roleId: "rol_OWNER",
			}),
		]);
	});

	it("refuses a caller without events.create, before writing anything", async () => {
		// An account whose role does not carry `events.create` — the guard is
		// real, not vacuously passing for every session.
		accountRoles.usr_bare = "VIEWER";

		await expectRejection(
			call(eventsRouter.create, NEW_EVENT, ctx("usr_bare")),
			{ code: "FORBIDDEN", status: 403 },
		);

		expect(createdEvents).toEqual([]);
		expect(memberWrites).toEqual([]);
	});
});

// ── Ownership: other authors' events stay closed ─────────────────

describe("ownership — other authors' events stay closed", () => {
	it("the author manages their own event through the OWNER membership", async () => {
		const permissions = await getEventPermissions("usr_owner", "evt_1");

		expect(permissions).toContain(PERMISSIONS.EVENT_UPDATE);
		expect(permissions).toContain(PERMISSIONS.EVENT_DELETE);
		await expect(
			requireEventPermission("usr_owner", "evt_1", PERMISSIONS.EVENT_UPDATE),
		).resolves.toBeUndefined();
	});

	it("a user with no membership cannot reach an event at all", async () => {
		await expectGuardRejection(
			requireEventPermission("usr_new", "evt_1", PERMISSIONS.EVENT_READ),
			"EVENT_ACCESS_DENIED",
		);
	});

	it("the author of one event cannot reach someone else's", async () => {
		await expectGuardRejection(
			requireEventPermission("usr_owner", "evt_2", PERMISSIONS.EVENT_READ),
			"EVENT_ACCESS_DENIED",
		);
		expect(await getEventPermissions("usr_owner", "evt_2")).toEqual([]);
	});

	it("a PENDING membership does not grant access", async () => {
		await expectGuardRejection(
			requireEventPermission("usr_pending", "evt_1", PERMISSIONS.EVENT_READ),
			"EVENT_ACCESS_DENIED",
		);
	});

	it("the account-level role never opens another author's event", async () => {
		// Even an account row pointing at an administrative role resolves to
		// NOTHING inside an event the user is not a member of: event-level
		// permissions answer from `EventMember` only.
		accountRoles.usr_stranger = "ADMIN";

		expect(await getEventPermissions("usr_stranger", "evt_1")).toEqual([]);
		await expectGuardRejection(
			requireEventPermission("usr_stranger", "evt_1", PERMISSIONS.EVENT_READ),
			"EVENT_ACCESS_DENIED",
		);
	});
});
