import { expo } from "@better-auth/expo";
import { createPrismaClient } from "@muxima/db";
import { createActivityLog } from "@muxima/db/activity-log";
import { env } from "@muxima/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { customSession } from "better-auth/plugins";

import { getUserAccess } from "./access";

const BLOCKED_USER_MESSAGE =
	"A tua conta está bloqueada. Contacta o suporte para a desbloquear.";

export function createAuth() {
	const prisma = createPrismaClient();

	return betterAuth({
		database: prismaAdapter(prisma, {
			provider: "postgresql",
		}),

		trustedOrigins: [
			env.CORS_ORIGIN,
			"muxima://",
			"exp://",
			"http://localhost:8081",
		],
		emailAndPassword: {
			enabled: true,
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		user: {
			additionalFields: {
				phone: {
					type: "string",
					required: false,
				},
				// Account lifecycle state. `input: false` keeps it read-only from
				// the client so it can only be changed through the API.
				status: {
					type: ["ACTIVE", "BLOCKED"],
					required: false,
					defaultValue: "ACTIVE",
					input: false,
				},
			},
		},
		databaseHooks: {
			session: {
				// The backend is the source of truth: a BLOCKED account can never
				// obtain a new session, whatever the client does.
				create: {
					async before(session, ctx) {
						if (!ctx) return;
						const user = (await ctx.context.internalAdapter.findUserById(
							session.userId,
						)) as { status?: string } | null;
						if (user?.status === "BLOCKED") {
							throw new APIError("FORBIDDEN", {
								message: BLOCKED_USER_MESSAGE,
								code: "ACCOUNT_BLOCKED",
							});
						}
					},
					// A session row is only ever *created* by a sign-in, so this is
					// the single place LOGIN is recorded — it covers web and native
					// clients alike without either of them reporting anything.
					async after(session) {
						await createActivityLog({
							userId: session.userId,
							action: "LOGIN",
							resource: "SESSION",
							resourceId: session.id,
							description: "Início de sessão",
							ipAddress: session.ipAddress,
							userAgent: session.userAgent,
						});
					},
				},
				// Sessions are removed on sign-out and when a password change
				// revokes the other devices. Either way the row is already gone by
				// the time `after` runs, so it carries everything the log needs.
				delete: {
					async after(session) {
						await createActivityLog({
							userId: session.userId,
							action: "LOGOUT",
							resource: "SESSION",
							resourceId: session.id,
							description: "Fim de sessão",
							ipAddress: session.ipAddress,
							userAgent: session.userAgent,
						});
					},
				},
			},
		},
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [
			expo(),
			/**
			 * Adds the caller's roles and permissions to the session response, so
			 * `GET /api/auth/get-session` carries them and the server-side
			 * `auth.api.getSession()` used by the oRPC context returns the exact
			 * same shape. Both read from `getUserAccess`, so the session, the
			 * profile endpoint and every authorization check share one origin —
			 * the `EventMember` rows — instead of three copies of the rules.
			 */
			customSession(async ({ user, session }) => {
				const access = await getUserAccess(user.id);

				return {
					user: {
						...user,
						roles: access.roles,
						permissions: access.permissions,
					},
					session,
				};
			}),
		],
	});
}

export const auth = createAuth();

export type {
	AccessRole,
	AccessRoleId,
	Permission,
	UserAccess,
} from "./access";
export {
	ACCESS_ROLES,
	EMPTY_ACCESS,
	getRolePermissions,
	getUserAccess,
	hasPermission,
	PERMISSIONS,
	resolvePermissions,
	toAccessRoles,
} from "./access";
export { BLOCKED_USER_MESSAGE };
