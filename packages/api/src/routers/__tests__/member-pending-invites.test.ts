import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Pending team invitations on the members screen.
 *
 * The unified team list (`members.list`) merges accepted memberships with
 * PENDING `EventInvitation` rows, and its actions (`members.remove` /
 * `members.updateRole`) accept an invitation id as well as a membership id.
 * Authorization is doubled here (it has its own suite); the point is the
 * routing of an invitation row to cancel/role-edit instead of a 404.
 */

const ctx = {
	session: { user: { id: "usr_owner", email: "owner@x.com", name: "Ana" } },
	requestHeaders: new Headers({ cookie: "s=1" }),
	userAgent: "vitest",
	ip: "10.0.0.1",
} as never;

let members: any[] = [];
let invitations: any[] = [];

function eventIdFrom(where: any): string | undefined {
	if (!where) return undefined;
	if (where.eventId) return where.eventId;
	if (Array.isArray(where.AND)) {
		for (const condition of where.AND) {
			const id = eventIdFrom(condition);
			if (id) return id;
		}
	}
	return undefined;
}

function buildDb() {
	return {
		user: {
			// `requireActiveUser` (the protectedProcedure middleware) reads the
			// caller's account state before every handler runs.
			findUnique: () =>
				Promise.resolve({ status: "ACTIVE", emailVerified: true }),
		},
		eventMember: {
			findUnique: ({ where }: any) =>
				Promise.resolve(members.find((m) => m.id === where.id) ?? null),
			findMany: ({ where }: any = {}) => {
				const eventId = eventIdFrom(where);
				const res = eventId
					? members.filter((m) => m.eventId === eventId)
					: [...members];
				return Promise.resolve(res);
			},
		},
		eventInvitation: {
			findUnique: ({ where }: any) =>
				Promise.resolve(invitations.find((i) => i.id === where.id) ?? null),
			findMany: ({ where }: any = {}) => {
				let res = [...invitations];
				if (where?.eventId)
					res = res.filter((i) => i.eventId === where.eventId);
				const statusFilter = where?.status;
				if (statusFilter?.in)
					res = res.filter((i) => statusFilter.in.includes(i.status));
				else if (statusFilter)
					res = res.filter((i) => i.status === statusFilter);
				if (where?.role) res = res.filter((i) => i.role === where.role);
				return Promise.resolve(res);
			},
			update: ({ where, data }: any) => {
				const invitation = invitations.find((i) => i.id === where.id);
				if (invitation) Object.assign(invitation, data);
				return Promise.resolve(invitation);
			},
		},
	};
}

vi.mock("@muxima/db", () => ({ default: buildDb() }));
vi.mock("@muxima/auth", () => ({ BLOCKED_USER_MESSAGE: "bloqueada" }));
vi.mock("../../shared/auth/authorization", () => ({
	requireEventPermission: vi.fn(() => Promise.resolve()),
	requireEventPermissionMutable: vi.fn(() => Promise.resolve()),
}));

const { call } = await import("@orpc/server");
const { membersRouter } = await import("../members");

beforeEach(() => {
	members = [
		{
			id: "mem_owner",
			eventId: "evt_1",
			userId: "usr_owner",
			role: "OWNER",
			status: "ACTIVE",
			createdAt: new Date("2026-01-01T10:00:00Z"),
			user: { id: "usr_owner", name: "Ana", email: "owner@x.com" },
		},
	];
	invitations = [
		{
			id: "eiv_1",
			eventId: "evt_1",
			email: "convidado@x.com",
			role: "EDITOR",
			status: "PENDING",
			pendingKey: "evt_1:convidado@x.com",
			createdAt: new Date("2026-02-01T10:00:00Z"),
			expiresAt: new Date("2026-02-08T10:00:00Z"),
		},
	];
});

describe("members.list — pending invitations", () => {
	it("merges a pending invitation with the memberships, newest first", async () => {
		const list = await call(
			membersRouter.list,
			{ eventId: "evt_1" },
			{ context: ctx },
		);

		expect(list.data.map((row: any) => row.id)).toEqual(["eiv_1", "mem_owner"]);
		const invite = list.data.find((row: any) => row.id === "eiv_1");
		expect(invite).toMatchObject({
			kind: "INVITATION",
			status: "PENDING",
			role: "EDITOR",
			user: { id: null, name: null, email: "convidado@x.com" },
		});
		expect(list.meta.total).toBe(2);
	});

	it("excludes invitations when filtering by a settled status", async () => {
		const list = await call(
			membersRouter.list,
			{ eventId: "evt_1", status: "ACTIVE" },
			{ context: ctx },
		);

		expect(list.data.map((row: any) => row.id)).toEqual(["mem_owner"]);
	});

	it("surfaces cancelled invitations and counts each status", async () => {
		invitations.push({
			id: "eiv_2",
			eventId: "evt_1",
			email: "cancelado@x.com",
			role: "VIEWER",
			status: "CANCELLED",
			pendingKey: null,
			createdAt: new Date("2026-03-01T10:00:00Z"),
			expiresAt: new Date("2026-03-08T10:00:00Z"),
		});

		const list = await call(
			membersRouter.list,
			{ eventId: "evt_1" },
			{ context: ctx },
		);

		expect(list.counts).toEqual({ active: 1, pending: 1, cancelled: 1 });
		expect(list.data.find((row: any) => row.id === "eiv_2")).toMatchObject({
			kind: "INVITATION",
			status: "CANCELLED",
		});
	});

	it("returns only cancelled invites when filtering by CANCELLED", async () => {
		invitations[0]!.status = "CANCELLED";

		const list = await call(
			membersRouter.list,
			{ eventId: "evt_1", status: "CANCELLED" },
			{ context: ctx },
		);

		expect(list.data.map((row: any) => row.id)).toEqual(["eiv_1"]);
		expect(list.data.every((row: any) => row.kind === "INVITATION")).toBe(true);
		expect(list.meta.total).toBe(1);
	});

	// The tabs filter server-side, so the counters MUST ignore the requested
	// status: opening Ativos may narrow the rows, but every badge still reports
	// the size of the whole team.
	it("keeps tab counters global while narrowing the list to one status", async () => {
		invitations.push({
			id: "eiv_2",
			eventId: "evt_1",
			email: "cancelado@x.com",
			role: "VIEWER",
			status: "CANCELLED",
			pendingKey: null,
			createdAt: new Date("2026-03-01T10:00:00Z"),
			expiresAt: new Date("2026-03-08T10:00:00Z"),
		});

		const list = await call(
			membersRouter.list,
			{ eventId: "evt_1", status: "ACTIVE" },
			{ context: ctx },
		);

		expect(list.data.map((row: any) => row.id)).toEqual(["mem_owner"]);
		expect(list.counts).toEqual({ active: 1, pending: 1, cancelled: 1 });
		expect(list.meta.total).toBe(1);
	});
});

describe("members.remove — invitation cancel", () => {
	it("cancels a pending invitation instead of 404ing", async () => {
		const res = await call(
			membersRouter.remove,
			{ memberId: "eiv_1" },
			{ context: ctx },
		);

		expect(res).toEqual({ success: true });
		expect(invitations[0]).toMatchObject({
			status: "CANCELLED",
			pendingKey: null,
		});
	});

	it("404s an unknown row id", async () => {
		await expect(
			call(membersRouter.remove, { memberId: "nope" }, { context: ctx }),
		).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" });
	});

	it("refuses to cancel an already-settled invitation", async () => {
		invitations[0]!.status = "ACCEPTED";

		await expect(
			call(membersRouter.remove, { memberId: "eiv_1" }, { context: ctx }),
		).rejects.toMatchObject({ code: "MEMBER_INVITE_NOT_PENDING" });
	});
});

describe("members.updateRole — invitation role", () => {
	it("edits the invited role before acceptance", async () => {
		const updated = await call(
			membersRouter.updateRole,
			{ memberId: "eiv_1", role: "VIEWER" },
			{ context: ctx },
		);

		expect(updated).toMatchObject({ id: "eiv_1", role: "VIEWER" });
		expect(invitations[0]).toMatchObject({ role: "VIEWER", status: "PENDING" });
	});
});
