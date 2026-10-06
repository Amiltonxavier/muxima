/**
 * Database-backed role and permission resolution.
 *
 * The vocabulary (which permission keys exist) and the seed matrix (which role
 * should hold which of them) live in the dependency-free `@muxima/permissions`
 * package; this module is only responsible for answering the question at
 * REQUEST time, from the database:
 *
 *   EventMember ──roleId──► Role ──1:N──► RolePermission ──N:1──► Permission
 *
 * `RolePermission` rows are the authoritative `role → permission` mapping at
 * runtime. The seed matrix is what wrote them (see `prisma/seed.ts`), so the
 * two cannot become independent sources of truth.
 *
 * Both `@muxima/auth` (session) and `@muxima/api` (guards) import from here,
 * which is what keeps the session, the profile endpoint and every authorization
 * check reading the same data.
 */
import { createPrismaClient } from "@muxima/db";
import {
	type AccessRoleId,
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
 * Resolve a user's permissions from the DATABASE (`RolePermission` rows).
 *
 * Only `ACTIVE` memberships count. A `PENDING` row is an invitation that has
 * not been accepted, and `requireEventAccess` refuses it, so counting it here
 * would advertise permissions the user cannot exercise anywhere else in the app
 * — the session would list `events.delete` while every event procedure rejects
 * them. Filter and authorization must agree, so both key off `ACTIVE`.
 *
 * A user with no active membership resolves to no permissions rather than to an
 * error: account creation must not depend on event membership, and
 * account-level actions (own profile, own password, own activity) stay
 * available to them.
 */
export async function resolvePermissionsFromDatabase(
	userId: string,
): Promise<Permission[]> {
	const roles = await resolveMembershipRoles(userId, { status: "ACTIVE" });
	if (roles.length === 0) return [];

	const prisma = createPrismaClient();
	const rows = await prisma.rolePermission.findMany({
		where: { role: { name: { in: roles } } },
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
 * Resolve a user's roles and permissions. Roles come from their `EventMember`
 * rows; permissions from the database `RolePermission` table.
 */
export async function getUserAccess(userId: string): Promise<UserAccess> {
	const [permissions, roles] = await Promise.all([
		resolvePermissionsFromDatabase(userId),
		resolveMembershipRoles(userId, { status: "ACTIVE" }),
	]);

	return {
		roles: toAccessRoles(roles),
		permissions,
	};
}
