import { getRolePermissions, type Permission } from "@muxima/permissions";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Behavioural cover for the three holes the audit called CRITICAL/ALTO.
 *
 * `permission-coverage.test.ts` proves the MATRIX is coherent and
 * `rest-authorization.test.ts` proves the ROUTES ask for a permission. Neither
 * answers the question these tests ask: given a real caller with a real role,
 * does the real procedure actually refuse? Every assertion below runs through
 * the oRPC middleware chain (`requireAuth` → `requireActiveUser` → the guard),
 * with only the database doubled — so a regression in the guard, in the
 * matrix lookup, or in the handler's own ordering fails here.
 *
 * Covered, in the audit's own terms:
 *
 * - F-01  a VIEWER (or ADMIN, or EDITOR) escalating a role through
 *        `members.updateRole`, and the OWNER row being undelegable;
 * - F-03  `notifications.markAsRead` / `delete` touching someone else's row;
 * - F-04  `tasks.list` / `tasks.getSchedules` reading an event the caller is
 *        not a member of — the cross-event read by `eventId`.
 */

// ── Database double ──────────────────────────────────────────────

type Membership = {
	id: string;
	eventId: string;
	userId: string;
	role: string;
	status: string;
};

type NotificationRow = {
	id: string;
	userId: string;
	readAt: Date | null;
};

let memberships: Membership[] = [];
let notifications: NotificationRow[] = [];
/** Toggled by the unverified-account test; every other caller is verified. */
let callerEmailVerified = true;
let eventRows: {
	id: string;
	status: string;
	eventDate: Date | null;
	startTime: string | null;
}[] = [];
/** Every `eventMember.update` the handlers performed, for ordering claims. */
let memberWrites: { where: { id: string }; data: Record<string, unknown> }[] =
	[];

const FUTURE = new Date(Date.now() + 86_400_000);

/**
 * Prisma's "record not found" for `update`/`delete` on a non-matching `where`.
 * Shaped exactly as `isPrismaKnownRequestError` expects, so `mapError`
 * translates it to 404 the same way the real client would.
 */
function p2025(): never {
	throw Object.assign(new Error("Record to update not found."), {
		name: "PrismaClientKnownRequestError",
		code: "P2025",
	});
}

function grantsFor(role: string) {
	return (
		getRolePermissions(role as Parameters<typeof getRolePermissions>[0])
			// Served as the `RolePermission` join rows the resolver reads. Serving
			// the real matrix keeps these tests honest about what each role holds
			// instead of granting everything and testing nothing.
			.map((key) => ({ permission: { key: key as Permission } }))
	);
}

/** Applies a flat `where` — the subset these handlers build — to one row. */
function matches(
	row: Record<string, unknown>,
	where: Record<string, unknown> | undefined,
): boolean {
	if (!where) return true;

	return Object.entries(where).every(([key, condition]) => {
		if (key === "AND") {
			return (condition as Record<string, unknown>[]).every((clause) =>
				matches(row, clause),
			);
		}
		// The IDOR guard lives here: `userId` in the `where` is what stops the
		// cross-account write, so the double honours it rather than assuming it.
		return row[key] === condition;
	});
}

const db = {
	user: {
		findUnique: () =>
			Promise.resolve({
				status: "ACTIVE",
				emailVerified: callerEmailVerified,
			}),
	},
	eventMember: {
		findFirst: (args: { where: Record<string, unknown> }) =>
			Promise.resolve(memberships.find((m) => matches(m, args.where)) ?? null),
		findUnique: (args: { where: Record<string, unknown> }) => {
			const row = memberships.find((m) => matches(m, args.where)) ?? null;
			return Promise.resolve(row);
		},
		findMany: () => Promise.resolve(memberships),
		update: (args: {
			where: { id: string };
			data: Record<string, unknown>;
		}) => {
			memberWrites.push(args);
			const row = memberships.find((m) => m.id === args.where.id);
			if (!row) p2025();
			Object.assign(row, args.data);
			return Promise.resolve(row);
		},
	},
	// The permission read: `getEventPermissions` asks for the grants of the
	// role the membership resolved to. Returning the seeded matrix means a
	// missing capability fails as 403 here instead of silently passing.
	rolePermission: {
		findMany: (args: { where: { role: { name: string } } }) =>
			Promise.resolve(grantsFor(args.where.role.name)),
	},
	role: {
		findUnique: (args: { where: { name: string } }) =>
			Promise.resolve({ id: `rol_${args.where.name}` }),
	},
	event: {
		findUnique: (args: { where: { id: string } }) =>
			Promise.resolve(eventRows.find((e) => e.id === args.where.id) ?? null),
	},
	notification: {
		update: (args: {
			where: { id: string; userId: string };
			data: { readAt: Date };
		}) => {
			const row = notifications.find((n) => matches(n, args.where));
			if (!row) p2025();
			row.readAt = args.data.readAt;
			return Promise.resolve(row);
		},
		delete: (args: { where: { id: string; userId: string } }) => {
			const index = notifications.findIndex((n) => matches(n, args.where));
			if (index === -1) p2025();
			const [removed] = notifications.splice(index, 1);
			return Promise.resolve(removed);
		},
	},
	task: {
		findMany: (args: { where: Record<string, unknown> }) =>
			Promise.resolve(tasks.filter((t) => matches(t, args.where)).slice(0, 20)),
		count: (args: { where: Record<string, unknown> }) =>
			Promise.resolve(tasks.filter((t) => matches(t, args.where)).length),
	},
	schedule: {
		findMany: (args: { where: Record<string, unknown> }) =>
			Promise.resolve(
				schedules.filter((s) => matches(s, args.where)).slice(0, 20),
			),
		count: (args: { where: Record<string, unknown> }) =>
			Promise.resolve(schedules.filter((s) => matches(s, args.where)).length),
	},
};

type TaskRow = {
	id: string;
	eventId: string;
	title: string;
	createdAt: Date;
};
type ScheduleRow = {
	id: string;
	eventId: string;
	title: string;
	startAt: Date;
};

let tasks: TaskRow[] = [];
let schedules: ScheduleRow[] = [];

vi.mock("@muxima/db", () => ({ default: db }));

vi.mock("@muxima/db/activity-log", () => ({
	createActivityLog: vi.fn(),
	buildChanges: () => [],
}));

vi.mock("@muxima/auth", () => ({
	BLOCKED_USER_MESSAGE: "Conta bloqueada",
	UNVERIFIED_USER_MESSAGE: "Confirma o teu email",
}));

const { call } = await import("@orpc/server");
const { membersRouter } = await import("../../../routers/members");
const { notificationsRouter } = await import("../../../routers/notifications");
const { tasksRouter } = await import("../../../routers/tasks");

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

async function expectRejection(
	run: Promise<unknown>,
	expected: { code: string; status: number },
): Promise<void> {
	await expect(run).rejects.toMatchObject({
		code: expected.code,
		status: expected.status,
	});
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
			id: "mem_editor",
			eventId: "evt_1",
			userId: "usr_editor",
			role: "EDITOR",
			status: "ACTIVE",
		},
		{
			id: "mem_viewer",
			eventId: "evt_1",
			userId: "usr_viewer",
			role: "VIEWER",
			status: "ACTIVE",
		},
		{
			id: "mem_admin",
			eventId: "evt_1",
			userId: "usr_admin",
			role: "ADMIN",
			status: "ACTIVE",
		},
		{
			id: "mem_pending",
			eventId: "evt_1",
			userId: "usr_pending",
			role: "ADMIN",
			status: "PENDING",
		},
	];
	notifications = [
		{ id: "ntf_mine", userId: "usr_viewer", readAt: null },
		{ id: "ntf_theirs", userId: "usr_owner", readAt: null },
	];
	eventRows = [
		{
			id: "evt_1",
			status: "PLANNING",
			eventDate: FUTURE,
			startTime: "18:00",
		},
		{
			id: "evt_2",
			status: "PLANNING",
			eventDate: FUTURE,
			startTime: "18:00",
		},
	];
	memberWrites = [];
	callerEmailVerified = true;
	tasks = [
		{ id: "tsk_1", eventId: "evt_1", title: "Reservar", createdAt: FUTURE },
		{ id: "tsk_2", eventId: "evt_2", title: "Alheia", createdAt: FUTURE },
	];
	schedules = [
		{
			id: "sch_1",
			eventId: "evt_1",
			title: "Cerimónia",
			startAt: FUTURE,
		},
		{
			id: "sch_2",
			eventId: "evt_2",
			title: "Alheio",
			startAt: FUTURE,
		},
	];
});

// ── F-01 · privilege escalation in `members.updateRole` ──────────

describe("privilege escalation — members.updateRole", () => {
	const promoteEditorToAdmin = {
		memberId: "mem_editor",
		role: "ADMIN" as const,
	};

	it("refuses a VIEWER escalating another member", async () => {
		await expectRejection(
			call(membersRouter.updateRole, promoteEditorToAdmin, ctx("usr_viewer")),
			{ code: "FORBIDDEN", status: 403 },
		);
		expect(memberWrites).toHaveLength(0);
	});

	it("refuses a VIEWER escalating THEMSELVES", async () => {
		// The exact escalation the audit described: the caller is the target.
		await expectRejection(
			call(
				membersRouter.updateRole,
				{ memberId: "mem_viewer", role: "ADMIN" },
				ctx("usr_viewer"),
			),
			{ code: "FORBIDDEN", status: 403 },
		);
		expect(memberWrites).toHaveLength(0);
		expect(memberships.find((m) => m.id === "mem_viewer")?.role).toBe("VIEWER");
	});

	it("refuses an ADMIN changing roles — team admin is not ownership", async () => {
		// `members.add`/`remove` are ADMIN-capable; `members.update-role` is
		// OWNER-only, because it is the path to owning the event.
		await expectRejection(
			call(membersRouter.updateRole, promoteEditorToAdmin, ctx("usr_admin")),
			{ code: "FORBIDDEN", status: 403 },
		);
		expect(memberWrites).toHaveLength(0);
	});

	it("refuses an EDITOR changing roles", async () => {
		await expectRejection(
			call(
				membersRouter.updateRole,
				{ memberId: "mem_viewer", role: "EDITOR" },
				ctx("usr_editor"),
			),
			{ code: "FORBIDDEN", status: 403 },
		);
		expect(memberWrites).toHaveLength(0);
	});

	it("refuses a caller who is only a PENDING member", async () => {
		// Membership exists and even carries an ADMIN role — the status filter
		// is what stops a not-yet-accepted invite from authorizing anything.
		await expectRejection(
			call(membersRouter.updateRole, promoteEditorToAdmin, ctx("usr_pending")),
			{ code: "EVENT_ACCESS_DENIED", status: 403 },
		);
		expect(memberWrites).toHaveLength(0);
	});

	it("lets the OWNER change a non-owner role", async () => {
		const updated = await call(
			membersRouter.updateRole,
			promoteEditorToAdmin,
			ctx("usr_owner"),
		);

		expect(updated).toMatchObject({ id: "mem_editor", role: "ADMIN" });
		expect(memberWrites).toHaveLength(1);
		// Both representations move together — enum and FK.
		expect(memberWrites[0]?.data).toMatchObject({
			role: "ADMIN",
			roleId: "rol_ADMIN",
		});
	});

	it("never lets the OWNER row be reassigned, even by the OWNER", async () => {
		await expectRejection(
			call(
				membersRouter.updateRole,
				{ memberId: "mem_owner", role: "ADMIN" },
				ctx("usr_owner"),
			),
			{ code: "EVENT_OWNER_PROTECTED", status: 403 },
		);
		expect(memberWrites).toHaveLength(0);
	});

	it("refuses a caller from ANOTHER event entirely", async () => {
		// `usr_stranger` holds no membership in evt_1: the permission check
		// never becomes a global grant just because they know the memberId.
		await expectRejection(
			call(membersRouter.updateRole, promoteEditorToAdmin, ctx("usr_stranger")),
			{ code: "EVENT_ACCESS_DENIED", status: 403 },
		);
		expect(memberWrites).toHaveLength(0);
	});
});

// ── F-03 · IDOR on notifications ─────────────────────────────────

describe("IDOR — notifications.markAsRead / delete", () => {
	it("marks the caller's own notification as read", async () => {
		const result = await call(
			notificationsRouter.markAsRead,
			{ id: "ntf_mine" },
			ctx("usr_viewer"),
		);

		expect(result.readAt).toBeInstanceOf(Date);
		expect(
			notifications.find((n) => n.id === "ntf_mine")?.readAt,
		).toBeInstanceOf(Date);
	});

	it("cannot mark ANOTHER user's notification as read", async () => {
		await expectRejection(
			call(
				notificationsRouter.markAsRead,
				{ id: "ntf_theirs" },
				ctx("usr_viewer"),
			),
			{ code: "NOT_FOUND", status: 404 },
		);
		// The row is untouched — the refusal is a filter, not a permission
		// check that a future refactor could forget to call.
		expect(notifications.find((n) => n.id === "ntf_theirs")?.readAt).toBeNull();
	});

	it("cannot delete ANOTHER user's notification", async () => {
		await expectRejection(
			call(notificationsRouter.delete, { id: "ntf_theirs" }, ctx("usr_viewer")),
			{ code: "NOT_FOUND", status: 404 },
		);
		expect(notifications.map((n) => n.id)).toContain("ntf_theirs");
	});

	it("deletes the caller's own notification", async () => {
		await call(
			notificationsRouter.delete,
			{ id: "ntf_mine" },
			ctx("usr_viewer"),
		);

		expect(notifications.map((n) => n.id)).not.toContain("ntf_mine");
		expect(notifications.map((n) => n.id)).toContain("ntf_theirs");
	});
});

// ── F-04 · cross-event reads ─────────────────────────────────────

describe("event access — tasks.list and tasks.getSchedules", () => {
	it("refuses tasks.list for an event the caller does not belong to", async () => {
		await expectRejection(
			call(tasksRouter.list, { eventId: "evt_2" }, ctx("usr_editor")),
			{ code: "EVENT_ACCESS_DENIED", status: 403 },
		);
	});

	it("refuses tasks.getSchedules for an event the caller does not belong to", async () => {
		await expectRejection(
			call(tasksRouter.getSchedules, { eventId: "evt_2" }, ctx("usr_editor")),
			{ code: "EVENT_ACCESS_DENIED", status: 403 },
		);
	});

	it("refuses a PENDING member even of the right event", async () => {
		await expectRejection(
			call(tasksRouter.list, { eventId: "evt_1" }, ctx("usr_pending")),
			{ code: "EVENT_ACCESS_DENIED", status: 403 },
		);
	});

	it("returns only the requested event's tasks to a member", async () => {
		const result = await call(
			tasksRouter.list,
			{ eventId: "evt_1" },
			ctx("usr_viewer"),
		);

		expect(result.data.map((t: { id: string }) => t.id)).toEqual(["tsk_1"]);
		expect(result.meta.total).toBe(1);
	});

	it("returns only the requested event's schedules to a member", async () => {
		const result = await call(
			tasksRouter.getSchedules,
			{ eventId: "evt_1" },
			ctx("usr_viewer"),
		);

		expect(result.data.map((s: { id: string }) => s.id)).toEqual(["sch_1"]);
	});

	it("gives a VIEWER read access — refusal is for writes, not sight", async () => {
		const result = await call(
			tasksRouter.list,
			{ eventId: "evt_1" },
			ctx("usr_viewer"),
		);

		expect(result.data).toHaveLength(1);
	});
});

// ── e-mail confirmation gate ────────────────────────────────────

describe("unverified account — protected procedures", () => {
	it("refuses an account whose e-mail is not confirmed", async () => {
		callerEmailVerified = false;

		await expectRejection(
			call(tasksRouter.list, { eventId: "evt_1" }, ctx("usr_editor")),
			{ code: "AUTH_EMAIL_NOT_VERIFIED", status: 403 },
		);
	});

	it("lets the same caller through once the e-mail is confirmed", async () => {
		const result = await call(
			tasksRouter.list,
			{ eventId: "evt_1" },
			ctx("usr_editor"),
		);

		expect(result.meta.total).toBe(1);
	});
});
