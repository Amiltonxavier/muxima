/**
 * Roles and the role → permission matrix — PURE module.
 *
 * No database, no env, no server imports: the Prisma seed and the web bundle
 * both need this vocabulary, and neither may pull in a database client to get
 * it. Everything that touches the database lives in `access.ts`.
 *
 * WHY THE MATRIX LIVES HERE AT ALL, given that the database is the source of
 * truth: it is the *seed definition*. `prisma/seed.ts` upserts this matrix into
 * `RolePermission`, and every request-time check reads those rows back. There is
 * therefore one matrix, compiled into the seed, and one at runtime — they
 * cannot drift without the seed being wrong, which the tests guard.
 *
 * The matrix is built from named capability blocks rather than hand-listed
 * keys, so a permission is granted by naming what it belongs to and the
 * per-role lists stay readable and auditable.
 */
import { PERMISSIONS, type Permission } from "./catalogue";

export {
	ALL_PERMISSIONS,
	isPermission,
	PERMISSIONS,
	type Permission,
	permissionName,
	splitPermission,
} from "./catalogue";

/**
 * The roles the application knows about.
 *
 * The first five mirror the `MemberRole` Prisma enum one-for-one — the tuple
 * is duplicated deliberately (rather than imported from the generated client)
 * so this module stays free of generated-code coupling; the tests guard the
 * two against drift. Those five are EVENT-MEMBER roles: they are what an
 * `EventMember` row may hold and therefore what decides access *inside* an
 * event.
 *
 * `USER` is different in kind: it is the ACCOUNT-level default granted to
 * every user at sign-up (persisted as `user.roleId`, never as
 * `EventMember.role`). It carries only self-service capabilities and
 * `events.create` — the right to START your own event. Everything inside an
 * event still comes from the membership the event's owner grants, so the base
 * role can never reach another author's event.
 */
export const ACCESS_ROLES = [
	"OWNER",
	"PARTNER",
	"ADMIN",
	"EDITOR",
	"VIEWER",
	"USER",
] as const;

export type AccessRoleId = (typeof ACCESS_ROLES)[number];

/**
 * The account-level role every user holds from sign-up onward — persisted as
 * `user.roleId` (never as an `EventMember.role`) and assigned by
 * `createUserCreateHook` in `@muxima/auth`.
 *
 * Resolution falls back to it when the column is null, so a user can never
 * end up with no roles at all.
 */
export const DEFAULT_ACCOUNT_ROLE = "USER";

/** A role as delivered to clients: stable id, display name, its permissions. */
export type AccessRole = {
	id: AccessRoleId;
	name: string;
	permissions: Permission[];
};

/**
 * Read capabilities. Every role gets these: a member who cannot see the event
 * has no reason to hold any permission in it.
 */
const READ_PERMISSIONS = [
	PERMISSIONS.PROFILE_READ,
	PERMISSIONS.ACTIVITY_READ,
	PERMISSIONS.EVENT_READ,
	PERMISSIONS.DASHBOARD_READ,
	PERMISSIONS.GUEST_READ,
	PERMISSIONS.TABLE_READ,
	PERMISSIONS.INVITATION_READ,
	PERMISSIONS.BUDGET_READ,
	PERMISSIONS.SUPPLIER_READ,
	PERMISSIONS.INVENTORY_READ,
	PERMISSIONS.TASK_READ,
	PERMISSIONS.SCHEDULE_READ,
	PERMISSIONS.FOOD_PLAN_READ,
	PERMISSIONS.CHECKLIST_READ,
	PERMISSIONS.DEDICATION_READ,
	PERMISSIONS.MEMBER_READ,
	PERMISSIONS.NOTIFICATION_READ,
] as const satisfies readonly Permission[];

/** Operational write capabilities for the planning modules. */
const OPERATIONAL_PERMISSIONS = [
	PERMISSIONS.BUDGET_CREATE,
	PERMISSIONS.BUDGET_UPDATE,
	PERMISSIONS.BUDGET_DELETE,
	PERMISSIONS.SUPPLIER_CREATE,
	PERMISSIONS.SUPPLIER_UPDATE,
	PERMISSIONS.SUPPLIER_DELETE,
	PERMISSIONS.INVENTORY_CREATE,
	PERMISSIONS.INVENTORY_UPDATE,
	PERMISSIONS.INVENTORY_DELETE,
	PERMISSIONS.TASK_CREATE,
	PERMISSIONS.TASK_UPDATE,
	PERMISSIONS.TASK_DELETE,
	PERMISSIONS.SCHEDULE_CREATE,
	PERMISSIONS.SCHEDULE_UPDATE,
	PERMISSIONS.SCHEDULE_DELETE,
	PERMISSIONS.FOOD_PLAN_CREATE,
	PERMISSIONS.FOOD_PLAN_UPDATE,
	PERMISSIONS.FOOD_PLAN_DELETE,
	PERMISSIONS.CHECKLIST_CREATE,
	PERMISSIONS.CHECKLIST_UPDATE,
	PERMISSIONS.CHECKLIST_DELETE,
] as const satisfies readonly Permission[];

/** Managing the guest list — the core operational work of the app. */
const GUEST_PERMISSIONS = [
	PERMISSIONS.GUEST_CREATE,
	PERMISSIONS.GUEST_UPDATE,
	PERMISSIONS.GUEST_DELETE,
] as const satisfies readonly Permission[];

/**
 * Seating tables.
 *
 * Tables exist to place the guests managed by `GUEST_PERMISSIONS`, so they sit
 * in the same tier — and, for the same reason, in the same tier an EDITOR
 * reaches: arranging the seating plan is ordinary planning work, not
 * administration. `VIEWER` keeps `tables.read` only.
 */
const TABLE_PERMISSIONS = [
	PERMISSIONS.TABLE_CREATE,
	PERMISSIONS.TABLE_UPDATE,
	PERMISSIONS.TABLE_DELETE,
] as const satisfies readonly Permission[];

/** Invitation lifecycle, including the privileged publish/unpublish action. */
const INVITATION_PERMISSIONS = [
	PERMISSIONS.INVITATION_CREATE,
	PERMISSIONS.INVITATION_UPDATE,
	PERMISSIONS.INVITATION_DELETE,
	PERMISSIONS.INVITATION_PUBLISH,
	PERMISSIONS.INVITATION_RESPOND,
] as const satisfies readonly Permission[];

/** Administration of the event itself. */
const EVENT_MANAGEMENT_PERMISSIONS = [
	PERMISSIONS.EVENT_CREATE,
	PERMISSIONS.EVENT_UPDATE,
	PERMISSIONS.EVENT_DELETE,
] as const satisfies readonly Permission[];

/** Dedications are personal content: anyone may write their own, nobody else's. */
const DEDICATION_PERMISSIONS = [
	PERMISSIONS.DEDICATION_CREATE,
	PERMISSIONS.DEDICATION_UPDATE,
	PERMISSIONS.DEDICATION_DELETE,
	PERMISSIONS.DEDICATION_SHARE,
] as const satisfies readonly Permission[];

/** Team management: invite, add, remove. Role changes are OWNER-only. */
const TEAM_ADMIN_PERMISSIONS = [
	PERMISSIONS.MEMBER_INVITE,
	PERMISSIONS.MEMBER_ADD,
	PERMISSIONS.MEMBER_REMOVE,
] as const satisfies readonly Permission[];

/** Every export capability. */
const EXPORT_PERMISSIONS = [
	PERMISSIONS.EXPORT_CREATE,
	PERMISSIONS.GUEST_EXPORT,
	PERMISSIONS.BUDGET_EXPORT,
	PERMISSIONS.SUPPLIER_EXPORT,
	PERMISSIONS.INVENTORY_EXPORT,
] as const satisfies readonly Permission[];

/** Self-service account capabilities. */
const SELF_SERVICE_PERMISSIONS = [
	PERMISSIONS.PROFILE_UPDATE,
	PERMISSIONS.PROFILE_PASSWORD_CHANGE,
	PERMISSIONS.NOTIFICATION_UPDATE,
	PERMISSIONS.NOTIFICATION_DELETE,
] as const satisfies readonly Permission[];

/**
 * The matrix. Design decisions worth stating explicitly:
 *
 * - `OWNER` holds everything, and only `OWNER` holds `members.update-role` and
 *   `events.delete`. Changing who owns the event, or deleting it, is not
 *   delegable — this is what makes privilege escalation structurally
 *   impossible rather than merely discouraged.
 * - `PARTNER` and `ADMIN` are near-equals on planning and guests; both update
 *   the event definition and manage the team, neither can transfer ownership.
 * - `EDITOR` writes operational data and their own dedications but touches
 *   neither the event definition, nor the team, nor exports.
 * - `VIEWER` is strictly read-only apart from their own profile and
 *   notifications.
 */
const ROLE_PERMISSIONS: Record<AccessRoleId, readonly Permission[]> = {
	OWNER: [
		...READ_PERMISSIONS,
		...OPERATIONAL_PERMISSIONS,
		...GUEST_PERMISSIONS,
		...TABLE_PERMISSIONS,
		...INVITATION_PERMISSIONS,
		...EVENT_MANAGEMENT_PERMISSIONS,
		...DEDICATION_PERMISSIONS,
		...TEAM_ADMIN_PERMISSIONS,
		...EXPORT_PERMISSIONS,
		...SELF_SERVICE_PERMISSIONS,
		PERMISSIONS.MEMBER_UPDATE_ROLE,
		PERMISSIONS.ACTIVITY_READ_ALL,
	],
	PARTNER: [
		...READ_PERMISSIONS,
		...OPERATIONAL_PERMISSIONS,
		...GUEST_PERMISSIONS,
		...TABLE_PERMISSIONS,
		...INVITATION_PERMISSIONS,
		...DEDICATION_PERMISSIONS,
		...TEAM_ADMIN_PERMISSIONS,
		...EXPORT_PERMISSIONS,
		...SELF_SERVICE_PERMISSIONS,
		PERMISSIONS.EVENT_UPDATE,
		PERMISSIONS.ACTIVITY_READ_ALL,
	],
	ADMIN: [
		...READ_PERMISSIONS,
		...OPERATIONAL_PERMISSIONS,
		...GUEST_PERMISSIONS,
		...TABLE_PERMISSIONS,
		...INVITATION_PERMISSIONS,
		...DEDICATION_PERMISSIONS,
		...TEAM_ADMIN_PERMISSIONS,
		...EXPORT_PERMISSIONS,
		...SELF_SERVICE_PERMISSIONS,
		PERMISSIONS.EVENT_UPDATE,
		PERMISSIONS.ACTIVITY_READ_ALL,
	],
	EDITOR: [
		...READ_PERMISSIONS,
		...GUEST_PERMISSIONS,
		...TABLE_PERMISSIONS,
		...DEDICATION_PERMISSIONS,
		...SELF_SERVICE_PERMISSIONS,
		// `GUEST_PERMISSIONS` already grants create/update on the guest list;
		// what an EDITOR adds on top is the planning work the elevated tiers
		// would otherwise have to do for them.
		PERMISSIONS.TASK_CREATE,
		PERMISSIONS.TASK_UPDATE,
		PERMISSIONS.SCHEDULE_CREATE,
		PERMISSIONS.SCHEDULE_UPDATE,
		PERMISSIONS.FOOD_PLAN_CREATE,
		PERMISSIONS.FOOD_PLAN_UPDATE,
		PERMISSIONS.CHECKLIST_CREATE,
		PERMISSIONS.CHECKLIST_UPDATE,
		PERMISSIONS.INVENTORY_CREATE,
		PERMISSIONS.INVENTORY_UPDATE,
		PERMISSIONS.INVITATION_CREATE,
		PERMISSIONS.INVITATION_UPDATE,
	],
	VIEWER: [...READ_PERMISSIONS, ...SELF_SERVICE_PERMISSIONS],
	/**
	 * The account-level default, assigned to every user at sign-up.
	 *
	 * Deliberately narrow: it holds the self-scoped capabilities plus the
	 * ability to create an event (and read it back — the coverage invariant
	 * "a write never comes without its read"). It grants NO administrative
	 * capability (`activity.read.all`, `members.*`, `events.delete` are all
	 * absent) and no event-scoped reads/writes beyond `events.*` themselves:
	 * managing the resources of an event — guests, budget, team — requires
	 * being a MEMBER of that event, which is how ownership stays enforced
	 * server-side. The author of a new event becomes its `OWNER` membership,
	 * and that membership, not this role, grants full control of that event.
	 */
	USER: [
		PERMISSIONS.EVENT_CREATE,
		PERMISSIONS.EVENT_READ,
		PERMISSIONS.ACTIVITY_READ,
		...SELF_SERVICE_PERMISSIONS,
		PERMISSIONS.PROFILE_READ,
		PERMISSIONS.NOTIFICATION_READ,
	],
};

/** De-duplicate while keeping declaration order. */
function dedupe(permissions: readonly Permission[]): Permission[] {
	return [...new Set(permissions)];
}

/**
 * The matrix, exposed for the seed and for documentation/tests. Returned as a
 * fresh object so a caller cannot mutate the shared arrays.
 *
 * Entries are de-duplicated on the way out. The matrix is assembled by
 * spreading shared tiers plus a role's extras, which is the readable way to
 * write it and also the easy way to introduce a repeat — and a repeat is not a
 * cosmetic problem: `prisma.seed` writes these rows into a table with a
 * `UNIQUE (roleId, permissionId)` constraint, so a single duplicated literal
 * aborts the entire seed with P2002. `permission-coverage.test.ts` asserts the
 * de-duplication directly, so a regression is caught by the test suite and not
 * by a half-applied database.
 */
export function getSeedRolePermissions(): Record<
	AccessRoleId,
	readonly Permission[]
> {
	return {
		OWNER: dedupe(ROLE_PERMISSIONS.OWNER),
		PARTNER: dedupe(ROLE_PERMISSIONS.PARTNER),
		ADMIN: dedupe(ROLE_PERMISSIONS.ADMIN),
		EDITOR: dedupe(ROLE_PERMISSIONS.EDITOR),
		VIEWER: dedupe(ROLE_PERMISSIONS.VIEWER),
		USER: dedupe(ROLE_PERMISSIONS.USER),
	};
}

export const ROLE_NAMES: Record<AccessRoleId, string> = {
	OWNER: "Proprietário",
	PARTNER: "Parceiro",
	ADMIN: "Administrador",
	EDITOR: "Editor",
	VIEWER: "Visualizador",
	USER: "Utilizador",
};

export const ROLE_DESCRIPTIONS: Record<AccessRoleId, string> = {
	OWNER:
		"Acesso total ao evento, incluindo eliminação e transferência de propriedade.",
	PARTNER: "Gestão ampla do evento, sem alterar a propriedade.",
	ADMIN: "Gestão operacional e da equipa, sem alterar a propriedade.",
	EDITOR: "Criação e edição operacional; sem gestão de equipa.",
	VIEWER: "Apenas leitura.",
	USER: "Acesso base da conta: criar os próprios eventos e gerir o perfil. Dentro de um evento, os direitos vêm da membria.",
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

/**
 * Permissions from the SEED matrix. Use only for seeding and tests —
 * request-time authorization must read the database (`RolePermission`).
 */
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
		for (const permission of ROLE_PERMISSIONS[role]) granted.add(permission);
	}
	return [...granted].sort();
}

/** The same roles, as the objects clients receive. */
export function toAccessRoles(roles: readonly AccessRoleId[]): AccessRole[] {
	const unique = [...new Set(roles)];
	return unique
		.map((id) => ({
			id,
			name: ROLE_NAMES[id],
			permissions: [...ROLE_PERMISSIONS[id]],
		}))
		.sort((a, b) => ACCESS_ROLES.indexOf(a.id) - ACCESS_ROLES.indexOf(b.id));
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

/** An access payload for a caller with no event membership. */
export const EMPTY_ACCESS: UserAccess = {
	roles: [],
	permissions: [],
};

export { PERMISSIONS as PERMISSION_CATALOGUE };
