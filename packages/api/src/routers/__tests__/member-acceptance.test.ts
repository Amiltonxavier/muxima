import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = (email = "convidado@x.com") =>
	({
		session: { user: { id: "usr_claimer", email, name: "Convidado" } },
		requestHeaders: new Headers({ cookie: "s=1" }),
		userAgent: "vitest",
		ip: "10.0.0.1",
	}) as never;

type InvitationRow = {
	id: string;
	eventId: string;
	email: string | null;
	role: string;
	token: string;
	status: string;
	expiresAt: Date;
	createdAt: Date;
	event: { name: string; status: string };
};

let invitations: InvitationRow[] = [];
let membersCreated: any[] = [];

function grantsFor(role: string) {
	if (role === "OWNER") return [{ permission: { key: "members.read" } }];
	return [];
}

function makeInvitation(): InvitationRow {
	return {
		id: "eiv_1",
		eventId: "evt_1",
		email: "convidado@x.com",
		role: "EDITOR",
		token: "tok_secure",
		status: "PENDING",
		expiresAt: new Date(Date.now() + 86400000),
		createdAt: new Date(),
		event: { name: "Casamento", status: "PLANNING" },
	};
}

function buildDb() {
	return {
		eventInvitation: {
			findFirst: ({ where }: any) =>
				Promise.resolve(
					invitations.find((i) => i.token === where.token) ?? null,
				),
			findUnique: ({ where }: any) =>
				Promise.resolve(invitations.find((i) => i.id === where.id) ?? null),
			findMany: ({ where }: any = {}) => {
				let res = [...invitations];
				if (where?.eventId)
					res = res.filter((i) => i.eventId === where.eventId);
				if (where?.status) res = res.filter((i) => i.status === where.status);
				if (where?.role) res = res.filter((i) => i.role === where.role);
				if (where?.email?.contains) {
					const needle = String(where.email.contains).toLowerCase();
					res = res.filter((i) => i.email?.toLowerCase().includes(needle));
				}
				return Promise.resolve(res);
			},
			update: ({ where, data }: any) => {
				const inv = invitations.find((i) => i.id === where.id);
				if (inv) Object.assign(inv, data);
				return Promise.resolve(inv);
			},
		},
		eventMember: {
			findFirst: ({ where }: any) => {
				const m = membersCreated.find(
					(m) =>
						m.eventId === where?.eventId &&
						m.userId === where?.userId &&
						(!where?.status || m.status === where.status),
				);
				return Promise.resolve(m ?? null);
			},
			findMany: ({ where }: any) => {
				let res = [...membersCreated];
				if (where?.eventId)
					res = res.filter((m) => m.eventId === where.eventId);
				if (where?.status) res = res.filter((m) => m.status === where.status);
				if (where?.role) res = res.filter((m) => m.role === where.role);
				return Promise.resolve(res);
			},
			count: ({ where }: any = {}) => {
				let res = [...membersCreated];
				if (where?.eventId)
					res = res.filter((m) => m.eventId === where.eventId);
				if (where?.status) res = res.filter((m) => m.status === where.status);
				if (where?.role) res = res.filter((m) => m.role === where.role);
				return Promise.resolve(res.length);
			},
			create: ({ data }: any) => {
				const m = {
					id: `mem_${membersCreated.length + 1}`,
					createdAt: new Date(),
					joinedAt: new Date(),
					user: {
						id: data.userId,
						name: "Convidado",
						email: "convidado@x.com",
					},
					...data,
				};
				membersCreated.push(m);
				return Promise.resolve(m);
			},
			findUnique: ({ where }: any) => {
				return Promise.resolve(
					membersCreated.find((m) => m.id === where.id) ?? null,
				);
			},
		},
		notification: {
			create: () => Promise.resolve({ id: "n1" }),
		},
		rolePermission: {
			findMany: ({ where }: any = {}) => {
				const name = where?.role?.name;
				if (name) return Promise.resolve(grantsFor(name));
				return Promise.resolve([]);
			},
		},
		role: {
			findUnique: () => Promise.resolve({ id: "role_editor" }),
		},
		user: {
			findUnique: ({ where }: any) => {
				if (where.email === "convidado@x.com") {
					return Promise.resolve({ id: "usr_claimer", name: "Convidado" });
				}
				if (where.id === "usr_claimer") {
					return Promise.resolve({
						id: "usr_claimer",
						name: "Convidado",
						email: "convidado@x.com",
					});
				}
				return Promise.resolve(null);
			},
		},
		event: {
			findUnique: ({ where }: any) => {
				if (where.id === "evt_1") {
					return Promise.resolve({
						id: "evt_1",
						name: "Casamento",
						ownerId: "owner_1",
					});
				}
				return Promise.resolve(null);
			},
		},
		$transaction: (fn: (tx: any) => Promise<any>) => fn(buildDb()),
	};
}

vi.mock("@muxima/db", () => ({ default: buildDb() }));
vi.mock("@muxima/auth", () => ({ BLOCKED_USER_MESSAGE: "bloqueada" }));

describe("Member acceptance & listing", () => {
	beforeEach(() => {
		invitations = [makeInvitation()];
		membersCreated = [];
	});

	it("accepting invitation creates ACTIVE membership visible in list", async () => {
		const { call } = await import("@orpc/server");
		const { memberInvitesRouter } = await import("../member-invites");
		const { membersRouter } = await import("../members");

		const res = await call(
			memberInvitesRouter.accept,
			{ token: "tok_secure" },
			{ context: ctx() },
		);
		expect(res.member.status).toBe("ACTIVE");

		const list = await call(
			membersRouter.list,
			{ eventId: "evt_1" },
			{ context: ctx() },
		);
		expect(list.data.length).toBe(1);
		expect(list.data[0]!.status).toBe("ACTIVE");
		expect(list.data[0]!.user?.email).toBe("convidado@x.com");
	});

	it("after acceptance, user passes event access check", async () => {
		const { call } = await import("@orpc/server");
		const { memberInvitesRouter } = await import("../member-invites");
		const { requireEventAccess } = await import(
			"../../shared/auth/event-access"
		);

		await call(
			memberInvitesRouter.accept,
			{ token: "tok_secure" },
			{ context: ctx() },
		);

		await expect(
			requireEventAccess("usr_claimer", "evt_1"),
		).resolves.toBeUndefined();
	});
});
