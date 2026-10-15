/**
 * The account-level default role — assigned at sign-up.
 *
 * Root cause this module exists for: roles used to live ONLY on `EventMember`,
 * so a brand-new user resolved to `roles: []` / `permissions: []` until they
 * created their first event, and nothing in the sign-up path ever wrote a
 * role. The base role closes that hole at both ends that matter:
 *
 *   - PERSISTENCE: `createUserCreateHook` runs as Better Auth's
 *     `databaseHooks.user.create.before`, so EVERY sign-up path (email/
 *     password, OTP, OAuth) writes `user.roleId` in the same insert that
 *     creates the account. The migration
 *     `20261009003825_add_user_default_role` back-fills existing users, and
 *     `prisma/seed.ts` assigns it to seeded ones.
 *   - RESOLUTION: `getUserAccess` falls back to `DEFAULT_ACCOUNT_ROLE` when
 *     the column is null (hand-inserted rows, anything the hook never saw), so
 *     no user can resolve to "no roles" at all.
 *
 * The role itself comes from the SHARED RBAC vocabulary — the `Role` /
 * `RolePermission` tables seeded from `@muxima/permissions` — there is no
 * second permission system here. The role carries no administrative
 * capability (`activity.read.all`, `members.*`, `events.delete` are absent by
 * construction; the coverage tests assert it).
 */
import { createPrismaClient } from "@muxima/db";
import { DEFAULT_ACCOUNT_ROLE, ROLE_DESCRIPTIONS } from "@muxima/permissions";
import type { User } from "better-auth";

type Db = ReturnType<typeof createPrismaClient>;

/**
 * The `user.additionalFields` entry for the persisted role FK.
 *
 * Declared so Better Auth treats `roleId` as part of the user model and the
 * Prisma adapter writes it; `input: false` keeps it out of every client
 * payload — a client can never choose its own role. It is only ever set by
 * `createUserCreateHook` below (or by the migration/seed).
 */
export const roleIdAdditionalField = {
	roleId: {
		type: "string",
		required: false,
		input: false,
	},
} as const;

/**
 * Idempotently ensure the default role row exists and return it.
 *
 * `role.name` is UNIQUE and Prisma's upsert compiles to `INSERT … ON
 * CONFLICT` on PostgreSQL, so two concurrent sign-ups against an unseeded
 * database cannot race into a P2002. Costs one round trip once the row
 * exists.
 */
export async function ensureDefaultRole(prisma: Db = createPrismaClient()) {
	return prisma.role.upsert({
		where: { name: DEFAULT_ACCOUNT_ROLE },
		update: {},
		create: {
			name: DEFAULT_ACCOUNT_ROLE,
			description: ROLE_DESCRIPTIONS[DEFAULT_ACCOUNT_ROLE],
		},
	});
}

/**
 * Better Auth's `user.create.before` hook: attach the default role's id to
 * the row being created.
 *
 * Deliberately NOT wrapped in a try/catch: if the role cannot be resolved the
 * sign-up fails loudly instead of silently persisting a user without a role —
 * the exact bug this hook fixes. (The resolution-side fallback in `access.ts`
 * still covers rows written by anything other than Better Auth.)
 */
export function createUserCreateHook(prisma: Db) {
	return async (user: User & Record<string, unknown>) => {
		const role = await ensureDefaultRole(prisma);

		return { data: { ...user, roleId: role.id } };
	};
}
