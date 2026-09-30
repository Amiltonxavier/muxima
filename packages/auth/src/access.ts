/**
 * Access control — the single source of truth for roles and permissions.
 *
 * Muxima has no separate role store: the `MemberRole` stored on `EventMember`
 * *is* the role system, already enforced per event by `requireEventAccess`.
 * This module derives everything else from it instead of introducing a second,
 * parallel notion of "who may do what":
 *
 *   EventMember.role  ──►  AccessRole[]  ──►  Permission[]
 *
 * The permission vocabulary below is the only place a permission may be granted,
 * and it is keyed by the existing `MemberRole` values — so adding a role is a
 * one-line change here and the frontend picks it up from the API response.
 * Permissions are never hardcoded in the client.
 *
 * Both `@muxima/auth` (session) and `@muxima/api` (procedures) import from
 * here, which is what keeps the session, the profile endpoint and the
 * authorization checks reading the same data.
 */
import { createPrismaClient } from "@muxima/db";

/**
 * Permission vocabulary. Values are `resource.action` strings, sorted for
 * readability. Keep in sync with `ROLE_PERMISSIONS` below.
 */
export const PERMISSIONS = {
	PROFILE_READ: "profile.read",
	PROFILE_UPDATE: "profile.update",
	PROFILE_PASSWORD_CHANGE: "profile.password.change",

	ACTIVITY_READ: "activity.read",
	ACTIVITY_READ_ALL: "activity.read.all",

	EVENT_READ: "event.read",
	EVENT_CREATE: "event.create",
	EVENT_UPDATE: "event.update",
	EVENT_DELETE: "event.delete",

	GUEST_READ: "guest.read",
	GUEST_CREATE: "guest.create",
	GUEST_UPDATE: "guest.update",
	GUEST_DELETE: "guest.delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * The roles the application knows about. These mirror the `MemberRole` Prisma
 * enum one-for-one — the tuple is duplicated deliberately (rather than imported
 * from the generated client) so this module stays free of generated-code
 * coupling; `assertRoleNamesMatch` in the tests guards the two against drift.
 */
export const ACCESS_ROLES = [
	"OWNER",
	"PARTNER",
	"ADMIN",
	"EDITOR",
	"VIEWER",
] as const;

export type AccessRoleId = (typeof ACCESS_ROLES)[number];

/** A role as delivered to clients: stable id, display name, its permissions. */
export type AccessRole = {
	id: AccessRoleId;
	name: string;
	permissions: Permission[];
};

/** Read models, available to any member. */
const READ_PERMISSIONS = [
	PERMISSIONS.PROFILE_READ,
	PERMISSIONS.ACTIVITY_READ,
	PERMISSIONS.EVENT_READ,
	PERMISSIONS.GUEST_READ,
] as const satisfies readonly Permission[];

/** Everything needed to administer a single event, without cross-user reach. */
const MANAGE_EVENT_PERMISSIONS = [
	PERMISSIONS.EVENT_CREATE,
	PERMISSIONS.EVENT_UPDATE,
	PERMISSIONS.EVENT_DELETE,
	PERMISSIONS.GUEST_CREATE,
	PERMISSIONS.GUEST_UPDATE,
	PERMISSIONS.GUEST_DELETE,
] as const satisfies readonly Permission[];

/**
 * Role → permissions. Widening a role is a single edit here; nothing else in
 * the codebase needs to change, and the frontend renders whatever it receives.
 */
const ROLE_PERMISSIONS: Record<AccessRoleId, readonly Permission[]> = {
	OWNER: [
		...READ_PERMISSIONS,
		...MANAGE_EVENT_PERMISSIONS,
		PERMISSIONS.PROFILE_UPDATE,
		PERMISSIONS.PROFILE_PASSWORD_CHANGE,
		// Only owners and admins may read another member's activity trail.
		PERMISSIONS.ACTIVITY_READ_ALL,
	],
	PARTNER: [
		...READ_PERMISSIONS,
		...MANAGE_EVENT_PERMISSIONS,
		PERMISSIONS.PROFILE_UPDATE,
		PERMISSIONS.PROFILE_PASSWORD_CHANGE,
		PERMISSIONS.ACTIVITY_READ_ALL,
	],
	ADMIN: [
		...READ_PERMISSIONS,
		...MANAGE_EVENT_PERMISSIONS,
		PERMISSIONS.PROFILE_UPDATE,
		PERMISSIONS.PROFILE_PASSWORD_CHANGE,
		PERMISSIONS.ACTIVITY_READ_ALL,
	],
	EDITOR: [
		...READ_PERMISSIONS,
		PERMISSIONS.EVENT_UPDATE,
		PERMISSIONS.GUEST_CREATE,
		PERMISSIONS.GUEST_UPDATE,
		PERMISSIONS.PROFILE_UPDATE,
		PERMISSIONS.PROFILE_PASSWORD_CHANGE,
	],
	VIEWER: [...READ_PERMISSIONS, PERMISSIONS.PROFILE_UPDATE],
};

const ROLE_NAMES: Record<AccessRoleId, string> = {
	OWNER: "Proprietário",
	PARTNER: "Parceiro",
	ADMIN: "Administrador",
	EDITOR: "Editor",
	VIEWER: "Visualizador",
};

export function isAccessRoleId(value: string): value is AccessRoleId {
	return (ACCESS_ROLES as readonly string[]).includes(value);
}

/**
 * Narrow an untrusted string (e.g. a role coming from the database) to a known
 * role id. Unknown values are dropped rather than trusted, so a role added to
 * the database without updating this module degrades to "no permissions"
 * instead of accidentally granting everything.
 */
export function toAccessRoleId(value: string): AccessRoleId | null {
	return isAccessRoleId(value) ? value : null;
}

export function getRolePermissions(role: AccessRoleId): Permission[] {
	return [...ROLE_PERMISSIONS[role]];
}

/**
 * Flatten a set of roles into the permissions they collectively grant, sorted
 * and de-duplicated so the value is stable across responses (useful for query
 * keys and cache equality).
 */
export function resolvePermissions(
	roles: readonly AccessRoleId[],
): Permission[] {
	const granted = new Set<Permission>();
	for (const role of roles) {
		for (const permission of ROLE_PERMISSIONS[role]) {
			granted.add(permission);
		}
	}
	return [...granted].sort();
}

export function toAccessRoles(roles: readonly AccessRoleId[]): AccessRole[] {
	return [...new Set(roles)].map((role) => ({
		id: role,
		name: ROLE_NAMES[role],
		permissions: getRolePermissions(role),
	}));
}

/**
 * The authorization primitive. Callers pass the caller's *own* resolved
 * permissions; this never touches the database, so it is safe to use from any
 * request-scoped code path.
 */
export function hasPermission(
	permissions: readonly Permission[],
	permission: Permission,
): boolean {
	return permissions.includes(permission);
}

/** Everything the UI and the API need to reason about one user's access. */
export type UserAccess = {
	roles: AccessRole[];
	permissions: Permission[];
};

/**
 * Resolve a user's roles and permissions from the `EventMember` rows they
 * actually hold. This is the only place that reads the role table, so the
 * session, the profile endpoint and every authorization check agree by
 * construction.
 *
 * Only `ACTIVE` memberships count. A `PENDING` row is an invitation that has
 * not been accepted, and `requireEventAccess` refuses it, so counting it here
 * would grant permissions the user cannot actually exercise anywhere else in
 * the app — the session would advertise `event.delete` while every event
 * procedure rejects them. Filter and authorization must agree, so both key off
 * `ACTIVE`.
 *
 * A user with no active membership resolves to no roles and no permissions
 * rather than to an error: account creation must not depend on event
 * membership, and account-level actions (reading their own profile, changing
 * their own password, reading their own activity) stay available to them.
 */
export async function getUserAccess(userId: string): Promise<UserAccess> {
	const prisma = createPrismaClient();

	const memberships = await prisma.eventMember.findMany({
		where: { userId, status: "ACTIVE" },
		select: { role: true },
		distinct: ["role"],
	});

	const roleIds = memberships
		.map((membership) => toAccessRoleId(membership.role))
		.filter((role): role is AccessRoleId => role !== null);

	return {
		roles: toAccessRoles(roleIds),
		permissions: resolvePermissions(roleIds),
	};
}

/** An access payload for a caller with no event membership. */
export const EMPTY_ACCESS: UserAccess = {
	roles: [],
	permissions: [],
};
