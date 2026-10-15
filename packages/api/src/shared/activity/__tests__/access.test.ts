import { beforeEach, describe, expect, it, vi } from "vitest";

type Membership = { role: string; status: string };

/**
 * The seed lives inside `vi.hoisted` because the module factory below runs before
 * the module body's declarations: a plain `let` at the top level would still be
 * in its temporal dead zone when the mocked module is first imported.
 */
const { seeded, grants, account, findMany, findGrants, findUser } = vi.hoisted(
	() => {
		const state = { rows: [] as { role: string; status: string }[] };
		const grantState = { rows: [] as { role: string; key: string }[] };
		// The account-level row (`user.roleId → Role.name`): `null` models a
		// missing FK, an unrecognised name models a hand-edited row.
		const accountState = { role: "USER" as string | null };
		return {
			seeded: state,
			grants: grantState,
			account: accountState,
			findMany: vi.fn((args: { where?: { status?: string } }) =>
				Promise.resolve(
					state.rows
						.filter((row) =>
							args.where?.status ? row.status === args.where.status : true,
						)
						.map(({ role }) => ({ role })),
				),
			),
			// The database is the authority: `RolePermission` rows are what the
			// session advertises. An empty result exercises the unseeded fallback;
			// a populated one exercises the real read path.
			findGrants: vi.fn(
				(args: { where?: { role?: { name?: { in?: string[] } } } }) => {
					const names = args.where?.role?.name?.in ?? [];
					return Promise.resolve(
						grantState.rows
							.filter((row) => names.includes(row.role))
							.map(({ key }) => ({ permission: { key } })),
					);
				},
			),
			findUser: vi.fn(() =>
				Promise.resolve({
					role: accountState.role === null ? null : { name: accountState.role },
				}),
			),
		};
	},
);

/**
 * `getUserAccess` reads the role table through `createPrismaClient`, so the
 * module boundary is mocked here. The role → permission mapping itself is pure
 * and is exercised directly.
 *
 * The double applies the `where` the production code actually sends. If
 * `getUserAccess` ever drops `status: "ACTIVE"`, the pending row stops being
 * filtered out and the regression test fails — a fake that ignored `where` would
 * pass either way.
 */
vi.mock("@muxima/db", () => ({
	createPrismaClient: () => ({
		eventMember: { findMany },
		rolePermission: { findMany: findGrants },
		user: { findUnique: findUser },
	}),
}));

const {
	ACCESS_ROLES,
	getRolePermissions,
	getUserAccess,
	hasPermission,
	PERMISSIONS,
	resolvePermissions,
	toAccessRoles,
} = await import("@muxima/auth");

function seedMemberships(memberships: Membership[]): void {
	seeded.rows = memberships;
}

/** Populate the `RolePermission` table the resolver reads. */
function seedGrants(rows: { role: string; key: string }[]): void {
	grants.rows = rows;
}

beforeEach(() => {
	findMany.mockClear();
	findGrants.mockClear();
	findUser.mockClear();
	grants.rows = [];
	account.role = "USER";
});

describe("ACCESS_ROLES", () => {
	it("mirrors the MemberRole enum with no duplicates", () => {
		// A duplicated role would make `resolvePermissions` and the session
		// payload unstable, so the vocabulary is asserted to be a clean set.
		expect(new Set(ACCESS_ROLES).size).toBe(ACCESS_ROLES.length);
		expect(ACCESS_ROLES).toContain("OWNER");
		expect(ACCESS_ROLES).toContain("VIEWER");
	});
});

describe("ROLE_PERMISSIONS", () => {
	it("grants reading another member's activity only to the elevated roles", () => {
		const holders = ACCESS_ROLES.filter((role) =>
			hasPermission(getRolePermissions(role), PERMISSIONS.ACTIVITY_READ_ALL),
		);

		expect(holders).toEqual(["OWNER", "PARTNER", "ADMIN"]);
	});

	it("keeps VIEWER read-only apart from its own profile", () => {
		const viewer = getRolePermissions("VIEWER");

		expect(viewer).toContain(PERMISSIONS.EVENT_READ);
		expect(viewer).toContain(PERMISSIONS.PROFILE_UPDATE);
		expect(viewer).not.toContain(PERMISSIONS.EVENT_UPDATE);
		expect(viewer).not.toContain(PERMISSIONS.EVENT_DELETE);
		expect(viewer).not.toContain(PERMISSIONS.ACTIVITY_READ_ALL);
	});

	it("reserves deleting an event to the OWNER", () => {
		// `events.delete` destroys the event and everything under it, so it is
		// deliberately narrower than the rest of the OWNER/PARTNER/ADMIN tier.
		const holders = ACCESS_ROLES.filter((role) =>
			hasPermission(getRolePermissions(role), PERMISSIONS.EVENT_DELETE),
		);

		expect(holders).toEqual(["OWNER"]);
	});
});

describe("resolvePermissions", () => {
	it("unions permissions across roles without duplicates", () => {
		const resolved = resolvePermissions(["VIEWER", "OWNER"]);

		expect(new Set(resolved).size).toBe(resolved.length);
		expect(resolved).toContain(PERMISSIONS.EVENT_DELETE);
	});

	it("returns a stable, sorted order so responses compare equal", () => {
		// Stable output keeps it usable as a TanStack Query key.
		const first = resolvePermissions(["OWNER", "EDITOR"]);
		const second = resolvePermissions(["EDITOR", "OWNER"]);

		expect(first).toEqual(second);
		expect([...first].sort()).toEqual(first);
	});

	it("grants nothing for no roles", () => {
		expect(resolvePermissions([])).toEqual([]);
	});
});

describe("toAccessRoles", () => {
	it("de-duplicates and labels roles for display", () => {
		const roles = toAccessRoles(["OWNER", "OWNER", "VIEWER"]);

		expect(roles.map((role) => role.id)).toEqual(["OWNER", "VIEWER"]);
		expect(roles[0]?.name).toBe("Proprietário");
	});

	it("attaches each role's own permissions", () => {
		const roles = toAccessRoles(["OWNER"]);

		expect(roles[0]?.permissions).toEqual(getRolePermissions("OWNER"));
	});
});

describe("getUserAccess", () => {
	it("resolves roles and permissions from active memberships", async () => {
		seedMemberships([
			{ role: "OWNER", status: "ACTIVE" },
			{ role: "VIEWER", status: "ACTIVE" },
		]);

		const access = await getUserAccess("usr_1");

		expect(access.roles.map((role) => role.id)).toEqual([
			"OWNER",
			"VIEWER",
			// The account default rides along with the memberships — it is
			// what a user holds even before their first event exists.
			"USER",
		]);
		expect(access.permissions).toContain(PERMISSIONS.ACTIVITY_READ_ALL);
	});

	it("ignores memberships that are not ACTIVE", async () => {
		// Regression: a PENDING row is an unaccepted invitation. `requireEventAccess`
		// refuses it, so counting it here would hand the session permissions the
		// rest of the app would then reject. Only the account default remains.
		seedMemberships([{ role: "OWNER", status: "PENDING" }]);

		const access = await getUserAccess("usr_1");

		expect(access.roles.map((role) => role.id)).toEqual(["USER"]);
		expect(access.permissions).toEqual(resolvePermissions(["USER"]));
		expect(access.permissions).not.toContain(PERMISSIONS.ACTIVITY_READ_ALL);
		expect(access.permissions).not.toContain(PERMISSIONS.EVENT_DELETE);
	});

	it("filters on ACTIVE membership status when querying", async () => {
		seedMemberships([]);

		await getUserAccess("usr_1");

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "usr_1", status: "ACTIVE" } }),
		);
	});

	it("always resolves the default role for a user with no memberships", async () => {
		// Account creation must not depend on event membership: the base `USER`
		// role is what a brand-new sign-up holds, and it is deliberately
		// non-administrative.
		seedMemberships([]);

		const access = await getUserAccess("usr_nobody");

		expect(access.roles.map((role) => role.id)).toEqual(["USER"]);
		expect(access.permissions).toContain(PERMISSIONS.EVENT_CREATE);
		expect(access.permissions).not.toContain(PERMISSIONS.ACTIVITY_READ_ALL);
		expect(access.permissions).not.toContain(PERMISSIONS.MEMBER_UPDATE_ROLE);
		expect(access.permissions).not.toContain(PERMISSIONS.EVENT_DELETE);
	});

	it("reads permissions from RolePermission, not from the seed matrix", async () => {
		// Regression: the matrix and the database are two different things. If
		// the resolver ever goes back to computing permissions from the role
		// name, revoking a grant in the admin UI would silently keep working.
		seedMemberships([{ role: "OWNER", status: "ACTIVE" }]);
		seedGrants([
			{ role: "OWNER", key: "events.read" },
			{ role: "OWNER", key: "guests.read" },
		]);

		const access = await getUserAccess("usr_1");

		expect(access.permissions).toEqual(["events.read", "guests.read"]);
		expect(access.permissions).not.toContain(PERMISSIONS.EVENT_DELETE);
	});

	it("falls back to the seed matrix when the role table has no grants", async () => {
		// An unseeded environment must not make every member of the app
		// powerless; it must be "stale but consistent".
		seedMemberships([{ role: "VIEWER", status: "ACTIVE" }]);

		const access = await getUserAccess("usr_1");

		expect(access.permissions).toEqual(resolvePermissions(["USER", "VIEWER"]));
	});

	it("ignores grants that are not known permission keys", async () => {
		// A stale or hand-edited row must not reach the client as a permission
		// the frontend cannot type-check.
		seedMemberships([{ role: "VIEWER", status: "ACTIVE" }]);
		seedGrants([
			{ role: "VIEWER", key: "events.read" },
			{ role: "VIEWER", key: "events.teleport" },
		]);

		const access = await getUserAccess("usr_1");

		expect(access.permissions).toEqual(["events.read"]);
	});

	it("drops roles it does not recognise", async () => {
		seedMemberships([
			{ role: "OWNER", status: "ACTIVE" },
			{ role: "SUPERUSER", status: "ACTIVE" },
		]);

		const access = await getUserAccess("usr_1");

		expect(access.roles.map((role) => role.id)).toEqual(["OWNER", "USER"]);
	});

	describe("the account-level role", () => {
		it("reads it from user.roleId and unions it with the memberships", async () => {
			account.role = "ADMIN";
			seedMemberships([{ role: "VIEWER", status: "ACTIVE" }]);

			const access = await getUserAccess("usr_1");

			expect(findUser).toHaveBeenCalledWith(
				expect.objectContaining({ where: { id: "usr_1" } }),
			);
			expect(access.roles.map((role) => role.id)).toEqual(["ADMIN", "VIEWER"]);
			expect(access.permissions).toContain(PERMISSIONS.ACTIVITY_READ_ALL);
		});

		it("falls back to the default role when the FK is null", async () => {
			// A row written without the hook (or by hand) still resolves to a
			// role — never to "no roles at all".
			account.role = null;
			seedMemberships([]);

			const access = await getUserAccess("usr_1");

			expect(access.roles.map((role) => role.id)).toEqual(["USER"]);
		});

		it("falls back to the default role when the role name is unknown", async () => {
			// An unknown account role degrades to baseline access, never to
			// whatever an unrecognised name might imply.
			account.role = "SUPERUSER";
			seedMemberships([]);

			const access = await getUserAccess("usr_1");

			expect(access.roles.map((role) => role.id)).toEqual(["USER"]);
			expect(access.permissions).not.toContain(PERMISSIONS.ACTIVITY_READ_ALL);
		});
	});
});
