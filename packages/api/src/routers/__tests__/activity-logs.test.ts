import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Exercises the activity endpoints through the real procedures, so the
 * middleware chain (`requireAuth` → `requireActiveUser`) and the input schemas
 * run exactly as they do in production. `call` invokes a procedure with an
 * injected context, which keeps the transport out of the picture.
 *
 * The database double applies the `where` the handler builds, so a widened
 * filter fails these tests rather than merely looking suspicious.
 */

// ── Database double ──────────────────────────────────────────────

type LogRow = {
	id: string;
	userId: string;
	action: string;
	resource: string;
	description: string;
	createdAt: Date;
	resourceId?: string | null;
	eventId?: string | null;
	metadata?: unknown;
};

let logs: LogRow[] = [];

function matchesWhere(
	row: LogRow,
	where: Record<string, unknown> | undefined,
): boolean {
	if (!where) return true;

	return Object.entries(where).every(([key, condition]) => {
		if (key === "AND") {
			return (condition as Record<string, unknown>[]).every((clause) =>
				matchesWhere(row, clause),
			);
		}
		if (key === "userId") return row.userId === condition;
		if (key === "action") return row.action === condition;
		if (key === "resource") return row.resource === condition;
		if (key === "createdAt") {
			const bounds = condition as { gte?: Date; lte?: Date };
			if (bounds.gte && row.createdAt < bounds.gte) return false;
			if (bounds.lte && row.createdAt > bounds.lte) return false;
			return true;
		}
		throw new Error(`fake-db: unmodelled filter "${key}"`);
	});
}

/** Prisma-flavoured subset used by the handler, with correct paging. */
const activityLogDelegate = {
	findMany: (args: {
		where?: Record<string, unknown>;
		orderBy?: { createdAt: "desc" | "asc" };
		skip?: number;
		take?: number;
	}) => {
		const matching = logs
			.filter((row) => matchesWhere(row, args.where))
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

		return Promise.resolve(
			matching.slice(
				args.skip ?? 0,
				(args.skip ?? 0) + (args.take ?? matching.length),
			),
		);
	},
	count: (args: { where?: Record<string, unknown> }) =>
		Promise.resolve(logs.filter((row) => matchesWhere(row, args.where)).length),
};

vi.mock("@muxima/db", () => ({
	default: {
		activityLog: activityLogDelegate,
		user: {
			findUnique: (args: { where: { id: string } }) =>
				Promise.resolve(
					args.where.id === "usr_blocked"
						? { status: "BLOCKED" }
						: { status: "ACTIVE" },
				),
		},
	},
	createPrismaClient: () => ({
		eventMember: { findMany: () => Promise.resolve([]) },
	}),
}));

// ── Access control double ─────────────────────────────────────────

let permissions: string[] = [];

vi.mock("@muxima/auth", () => ({
	BLOCKED_USER_MESSAGE: "blocked",
	getUserAccess: () =>
		Promise.resolve({
			roles: [{ id: "OWNER", name: "Proprietário", permissions }],
			permissions,
		}),
	hasPermission: (granted: readonly string[], permission: string) =>
		granted.includes(permission),
	PERMISSIONS: { ACTIVITY_READ_ALL: "activity.read.all" },
	auth: {},
}));

vi.mock("@muxima/db/activity-log", () => ({
	createActivityLog: vi.fn(),
	buildChanges: () => [],
}));

const { call } = await import("@orpc/server");
const { appRouter } = await import("../../routers/index");

// ── World ─────────────────────────────────────────────────────────

const OWNER = "usr_owner"; // holds activity.read.all
const VIEWER = "usr_viewer"; // holds only activity.read
const OTHER = "usr_other"; // someone else's trail

const BASE = new Date("2026-01-10T10:00:00.000Z");

function seedLogs(): void {
	logs = [
		{
			id: "log_o1",
			userId: OWNER,
			action: "LOGIN",
			resource: "SESSION",
			description: "Entrou",
			createdAt: new Date(BASE),
		},
		{
			id: "log_o2",
			userId: OWNER,
			action: "PROFILE_UPDATED",
			resource: "PROFILE",
			description: "Nome alterado",
			createdAt: new Date(BASE.getTime() - 1000),
		},
		{
			id: "log_v1",
			userId: VIEWER,
			action: "LOGIN",
			resource: "SESSION",
			description: "Entrou",
			createdAt: new Date(BASE.getTime() - 2000),
		},
		{
			id: "log_x1",
			userId: OTHER,
			action: "LOGIN",
			resource: "SESSION",
			description: "Entrou",
			createdAt: new Date(BASE.getTime() - 3000),
		},
	];
}

/** A context as `createContext` would build it for an active session. */
function contextFor(userId: string) {
	return {
		session: { user: { id: userId } },
		requestHeaders: new Headers(),
		userAgent: "vitest",
		ip: "10.0.0.1",
	} as never;
}

const list = (input: Record<string, unknown>, userId: string) =>
	call(appRouter.activityLogs.list, input, { context: contextFor(userId) });

beforeEach(() => {
	seedLogs();
	permissions = [];
});

describe("activityLogs.list — own history", () => {
	it("returns only the caller's own logs by default", async () => {
		const result = await list({}, VIEWER);

		expect(result.data.map((log) => log.id)).toEqual(["log_v1"]);
	});

	it("keeps the caller pinned to their own id even with read-all", async () => {
		// An elevated role does not silently become "everyone's history": with no
		// explicit target the answer is still the caller's own trail.
		permissions = ["activity.read.all"];

		const result = await list({}, OWNER);

		expect(result.data.map((log) => log.id)).toEqual(["log_o1", "log_o2"]);
		expect(result.data.every((log) => log.userId === OWNER)).toBe(true);
	});

	it("rejects a caller with no session", async () => {
		await expect(
			call(
				appRouter.activityLogs.list,
				{},
				{ context: { requestHeaders: new Headers() } as never },
			),
		).rejects.toThrow();
	});

	it("rejects a blocked account", async () => {
		await expect(list({}, "usr_blocked")).rejects.toThrow();
	});
});

describe("activityLogs.list — reaching another user", () => {
	it("forbids a non-elevated caller from targeting someone else", async () => {
		permissions = ["activity.read"];

		await expect(list({ userId: OTHER }, VIEWER)).rejects.toThrow(
			/outro utilizador/,
		);
	});

	it("forbids a caller with no permissions at all", async () => {
		await expect(list({ userId: OTHER }, VIEWER)).rejects.toThrow();
	});

	it("allows an elevated caller to target someone else explicitly", async () => {
		permissions = ["activity.read.all"];

		const result = await list({ userId: OTHER }, OWNER);

		expect(result.data.map((log) => log.id)).toEqual(["log_x1"]);
	});

	it("treats naming yourself as a plain own-history read", async () => {
		// No permission needed: this is not an escalation.
		permissions = [];

		const result = await list({ userId: VIEWER }, VIEWER);

		expect(result.data.map((log) => log.id)).toEqual(["log_v1"]);
	});
});

describe("activityLogs.list — filters and pagination", () => {
	it("filters by action", async () => {
		const result = await list({ action: "LOGIN" }, OWNER);

		expect(result.data.map((log) => log.id)).toEqual(["log_o1"]);
	});

	it("filters by resource", async () => {
		const result = await list({ resource: "PROFILE" }, OWNER);

		expect(result.data.map((log) => log.id)).toEqual(["log_o2"]);
	});

	it("filters by date range", async () => {
		// A window wide enough to hold log_o1 (at BASE) but not log_o2 (BASE-1s).
		const result = await list(
			{
				from: new Date(BASE.getTime() - 500).toISOString(),
				to: new Date(BASE.getTime() + 500).toISOString(),
			},
			OWNER,
		);

		expect(result.data.map((log) => log.id)).toEqual(["log_o1"]);
	});

	it("paginates in the database and reports the total", async () => {
		// Newest first, so log_o1 (at BASE) precedes log_o2 (BASE-1s).
		const page1 = await list({ page: 1, limit: 1 }, OWNER);
		expect(page1.data).toHaveLength(1);
		expect(page1.data.map((log) => log.id)).toEqual(["log_o1"]);
		expect(page1.meta).toMatchObject({
			total: 2,
			page: 1,
			limit: 1,
			totalPages: 2,
		});

		const page2 = await list({ page: 2, limit: 1 }, OWNER);
		expect(page2.data).toHaveLength(1);
		expect(page2.data.map((log) => log.id)).toEqual(["log_o2"]);
	});

	it("combines the own-user scope with filters", async () => {
		// The scope filter and the action filter must both apply.
		const result = await list({ action: "LOGIN" }, VIEWER);

		expect(result.data.map((log) => log.id)).toEqual(["log_v1"]);
	});

	it("rejects a nonsensical page size", async () => {
		await expect(list({ limit: 5000 }, OWNER)).rejects.toThrow();
	});
});
