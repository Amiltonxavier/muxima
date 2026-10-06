/**
 * Permission resolution — the read side of the authorization service.
 *
 * This module answers "which permissions does this user hold?" for every
 * request path. It deliberately contains no throwing logic: `requirePermission`
 * and friends live in `authorization.ts`, so reading access and enforcing it
 * stay separable and each can be tested on its own.
 *
 * Everything resolves through the DATABASE (`RolePermission`), never through a
 * hardcoded map — see `packages/auth/src/access.ts` for why. The pure helpers
 * come from `@muxima/permissions` (no database) and only the resolver itself is
 * imported from `@muxima/auth`.
 */
import { resolvePermissionsFromDatabase } from "@muxima/auth";
import db from "@muxima/db";
import {
	type AccessRoleId,
	isPermission,
	type Permission,
	resolvePermissions,
	toAccessRoleId,
} from "@muxima/permissions";

/** The role a user holds in a given event, or `null` without ACTIVE access. */
export async function getEventRole(
	userId: string,
	eventId: string,
): Promise<AccessRoleId | null> {
	const membership = await db.eventMember.findFirst({
		where: { userId, eventId, status: "ACTIVE" },
		select: { role: true, roleRef: { select: { name: true } } },
	});

	if (!membership) return null;
	return toAccessRoleId(membership.roleRef?.name ?? membership.role);
}

/**
 * Permissions a user holds *within one event*, from that membership's role.
 *
 * This is the permission check every event-scoped procedure should use: a user
 * may be `OWNER` of one event and `VIEWER` of another, and the answer differs.
 * The account-wide set (`resolvePermissionsFromDatabase`) is a union across all
 * memberships and is therefore only appropriate for account-level surfaces.
 */
export async function getEventPermissions(
	userId: string,
	eventId: string,
): Promise<Permission[]> {
	const role = await getEventRole(userId, eventId);
	if (!role) return [];

	// Resolve the role's grants directly instead of reusing the account-level
	// resolver: that one unions every membership of the user, so it would leak
	// permissions granted in OTHER events into this one.
	const rows = await db.rolePermission.findMany({
		where: { role: { name: role } },
		select: { permission: { select: { key: true } } },
	});

	const keys = new Set<Permission>();
	for (const row of rows) {
		if (isPermission(row.permission.key)) keys.add(row.permission.key);
	}

	// Unseeded database: fall back to the same matrix the seed writes, so the
	// failure mode is "stale but consistent" instead of "nobody can do anything".
	if (keys.size === 0) return resolvePermissions([role]);

	return [...keys].sort();
}

/** Whether the user holds `permission` in this event. */
export async function hasEventPermission(
	userId: string,
	eventId: string,
	permission: Permission,
): Promise<boolean> {
	return (await getEventPermissions(userId, eventId)).includes(permission);
}

/** The account-wide permission set (union of every ACTIVE membership). */
export async function getUserPermissions(
	userId: string,
): Promise<Permission[]> {
	return resolvePermissionsFromDatabase(userId);
}

/** Every distinct role the user currently holds, across all events. */
export async function getUserRoles(userId: string): Promise<AccessRoleId[]> {
	const memberships = await db.eventMember.findMany({
		where: { userId, status: "ACTIVE" },
		select: { role: true, roleRef: { select: { name: true } } },
		distinct: ["role"],
	});

	const roles = memberships
		.map((membership) =>
			toAccessRoleId(membership.roleRef?.name ?? membership.role),
		)
		.filter((role): role is AccessRoleId => role !== null);

	return [...new Set(roles)];
}
