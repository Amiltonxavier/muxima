/**
 * Database-backed role and permission resolution.
 *
 * The vocabulary (which permission keys exist) and the seed matrix (which role
 * should hold which of them) live in the dependency-free `@muxima/permissions`
 * package; this module is only responsible for answering the question at
 * REQUEST time, from the database:
 *
 *   account level:  User ──roleId──► Role ──1:N──► RolePermission ──N:1──► Permission
 *   event level:    EventMember ──roleId──► Role ──1:N──► RolePermission ──N:1──► Permission
 *
 * `RolePermission` rows are the authoritative `role → permission` mapping at
 * runtime. The seed matrix is what wrote them (see `prisma/seed.ts`), so the
 * two cannot become independent sources of truth.
 *
 * Account-level answers (this file's resolvers) UNION the account default
 * role with every ACTIVE membership; EVENT-level answers
 * (`getEventPermissions` in `@muxima/api`) read only the membership of that
 * one event — which is what keeps the base `USER` role from ever opening
 * another author's event.
 *
 * Both `@muxima/auth` (session) and `@muxima/api` (guards) import from here,
 * which is what keeps the session, the profile endpoint and every authorization
 * check reading the same data.
 */
import { createPrismaClient } from "@muxima/db";
import {
	type AccessRoleId,
	DEFAULT_ACCOUNT_ROLE,
	isPermission,
	type Permission,
	resolvePermissions,
	toAccessRoleId,
	toAccessRoles,
	type UserAccess,
} from "@muxima/permissions";

export * from "@muxima/permissions";

/** Resolves the distinct roles a user holds, optionally filtered by status. */
export async function resolveMembershipRoles(
	userId: string,
	filter: { status?: "ACTIVE" } = { status: "ACTIVE" },
): Promise<AccessRoleId[]> {
	const prisma = createPrismaClient();

	const memberships = await prisma.eventMember.findMany({
		where: { userId, status: filter.status },
		select: { role: true, roleRef: { select: { name: true } } },
		distinct: ["role"],
	});

	return [
		...new Set(
			memberships
				.map((membership) =>
					toAccessRoleId(membership.roleRef?.name ?? membership.role),
				)
				.filter((role): role is AccessRoleId => role !== null),
		),
	];
}

/**
 * Resolve the caller's ACCOUNT-level role: `user.roleId → Role.name`.
 *
 * This is the role assigned at sign-up (`createUserCreateHook`), which makes
 * it the one answer that exists for a user with no event membership yet.
 *
 * A missing row, a null FK or an unrecognised role name all degrade to
 * `DEFAULT_ACCOUNT_ROLE` — never to "no role": the requirement is that no
 * normal user is left roleless, and the default carries no administrative
 * capability, so the failure mode is "baseline access" rather than either
 * "lockout" or "escalation".
 */
export async function resolveAccountRole(
	userId: string,
): Promise<AccessRoleId> {
	const prisma = createPrismaClient();
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { role: { select: { name: true } } },
	});

	return toAccessRoleId(user?.role?.name ?? "") ?? DEFAULT_ACCOUNT_ROLE;
}

/**
 * Every role the caller holds, account level: the account default first,
 * then the distinct roles of their `ACTIVE` memberships, de-duplicated.
 */
async function resolveAccessRoles(userId: string): Promise<AccessRoleId[]> {
	const [accountRole, membershipRoles] = await Promise.all([
		resolveAccountRole(userId),
		resolveMembershipRoles(userId, { status: "ACTIVE" }),
	]);

	return [...new Set([accountRole, ...membershipRoles])];
}

/**
 * Read `RolePermission` rows for a known set of roles.
 *
 * Only `ACTIVE` memberships and the account role reach this function. A
 * `PENDING` row is an invitation that has not been accepted, and
 * `requireEventAccess` refuses it, so counting it here would advertise
 * permissions the user cannot exercise anywhere else in the app — the session
 * would list `events.delete` while every event procedure rejects them. Filter
 * and authorization must agree, so both key off `ACTIVE`.
 */
async function resolvePermissionsForRoles(
	roles: readonly AccessRoleId[],
): Promise<Permission[]> {
	if (roles.length === 0) return [];

	const prisma = createPrismaClient();
	const rows = await prisma.rolePermission.findMany({
		where: { role: { name: { in: [...roles] } } },
		select: { permission: { select: { key: true } } },
	});

	const keys = new Set<Permission>();
	for (const row of rows) {
		if (isPermission(row.permission.key)) keys.add(row.permission.key);
	}

	// An unseeded database must not silently make every member of the app
	// powerless. Fall back to the same matrix the seed writes, so the failure
	// mode is "stale but consistent" rather than "nobody can do anything".
	if (keys.size === 0) return resolvePermissions(roles);

	return [...keys].sort();
}

/**
 * Resolve a user's permissions from the DATABASE (`RolePermission` rows):
 * the account default role UNION every ACTIVE membership's role.
 *
 * A user with no membership resolves to the permissions of the default role
 * alone rather than to an error or to nothing: account creation must not
 * depend on event membership, and the default is what lets a brand-new user
 * create their first event while keeping account-level actions (own profile,
 * own password, own activity) available.
 */
export async function resolvePermissionsFromDatabase(
	userId: string,
): Promise<Permission[]> {
	return resolvePermissionsForRoles(await resolveAccessRoles(userId));
}

/**
 * Resolve a user's roles and permissions. Roles come from the account-level
 * default plus their `EventMember` rows; permissions from the database
 * `RolePermission` table.
 */
export async function getUserAccess(userId: string): Promise<UserAccess> {
	const roles = await resolveAccessRoles(userId);

	return {
		roles: toAccessRoles(roles),
		permissions: await resolvePermissionsForRoles(roles),
	};
}
