import { beforeEach, describe, expect, it, vi } from "vitest";

type Membership = { role: string; status: string };

/**
 * The seed lives inside `vi.hoisted` because the module factory below runs before
 * the module body's declarations: a plain `let` at the top level would still be
 * in its temporal dead zone when the mocked module is first imported.
 */
const { seeded, findMany } = vi.hoisted(() => {
	const state = { rows: [] as { role: string; status: string }[] };
	return {
		seeded: state,
		findMany: vi.fn((args: { where?: { status?: string } }) =>
			Promise.resolve(
				state.rows
					.filter((row) =>
						args.where?.status ? row.status === args.where.status : true,
					)
					.map(({ role }) => ({ role })),
			),
		),
	};
});

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
	createPrismaClient: () => ({ eventMember: { findMany } }),
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

beforeEach(() => {
	findMany.mockClear();
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

	it("only OWNER and PARTNER and ADMIN may delete an event", () => {
		const holders = ACCESS_ROLES.filter((role) =>
			hasPermission(getRolePermissions(role), PERMISSIONS.EVENT_DELETE),
		);

		expect(holders).toEqual(["OWNER", "PARTNER", "ADMIN"]);
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

		expect(access.roles.map((role) => role.id)).toEqual(["OWNER", "VIEWER"]);
		expect(access.permissions).toContain(PERMISSIONS.ACTIVITY_READ_ALL);
	});

	it("ignores memberships that are not ACTIVE", async () => {
		// Regression: a PENDING row is an unaccepted invitation. `requireEventAccess`
		// refuses it, so counting it here would hand the session permissions the
		// rest of the app would then reject.
		seedMemberships([{ role: "OWNER", status: "PENDING" }]);

		const access = await getUserAccess("usr_1");

		expect(access.roles).toEqual([]);
		expect(access.permissions).toEqual([]);
	});

	it("filters on ACTIVE membership status when querying", async () => {
		seedMemberships([]);

		await getUserAccess("usr_1");

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "usr_1", status: "ACTIVE" } }),
		);
	});

	it("resolves no access for a user with no memberships", async () => {
		// Account creation must not depend on event membership.
		seedMemberships([]);

		expect(await getUserAccess("usr_nobody")).toEqual({
			roles: [],
			permissions: [],
		});
	});

	it("drops roles it does not recognise", async () => {
		seedMemberships([
			{ role: "OWNER", status: "ACTIVE" },
			{ role: "SUPERUSER", status: "ACTIVE" },
		]);

		const access = await getUserAccess("usr_1");

		expect(access.roles.map((role) => role.id)).toEqual(["OWNER"]);
	});
});
