import { expo } from "@better-auth/expo";
import { createPrismaClient } from "@muxima/db";
import { createActivityLog } from "@muxima/db/activity-log";
import { env } from "@muxima/env/server";
import { MailService } from "@muxima/mail";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { customSession } from "better-auth/plugins";

import { getUserAccess } from "./access";
import { createUserCreateHook, roleIdAdditionalField } from "./default-role";
import { emailVerificationOptions } from "./email-verification";
import { createEmailOtpPlugin } from "./otp";
import { evaluateSessionGate } from "./session-gate";

/**
 * Public web origin the verification e-mail links back to. `FRONTEND_URL` is
 * the explicit source; `CORS_ORIGIN` (always set) is the same origin the SPA
 * is served from, mirroring the invitation QR-code helper's fallback.
 */
function getFrontendUrl(): string {
	return env.FRONTEND_URL ?? env.CORS_ORIGIN;
}

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
			// A nova conta fica inativa até o e-mail ser confirmado: o registo
			// não abre sessão (`autoSignIn: false`) e o início de sessão falha
			// com `EMAIL_NOT_VERIFIED` enquanto `emailVerified` for falso.
			requireEmailVerification: true,
			autoSignIn: false,
		},
		emailVerification: emailVerificationOptions({
			frontendUrl: getFrontendUrl(),
			deliver: async ({ email, name, verifyUrl, expiresInMinutes }) => {
				await MailService.sendEmailVerification({
					to: email,
					name,
					verifyUrl,
					expiresInMinutes,
				});
			},
		}),
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		session: {
			// Política de expiração: sessão com TTL máximo de 1 dia
			// (conforme auditoria e requisitos de segurança)
			expiresIn: 60 * 60 * 24, // 86400 segundos
		},
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
				// The account-level default role FK. Written only by the
				// `user.create.before` hook below (`input: false` keeps clients
				// from ever choosing their own role) — see `./default-role`.
				...roleIdAdditionalField,
			},
		},
		databaseHooks: {
			user: {
				create: {
					// Every sign-up path (email/password, OTP, OAuth) funnels
					// through Better Auth's user creation, so this hook is the
					// single place that assigns the base `USER` role — persisted
					// as `user.roleId` in the same insert that creates the
					// account. No user can be created without a role.
					before: createUserCreateHook(prisma),
				},
			},
			session: {
				// The backend is the source of truth: neither a BLOCKED account nor
				// an account whose e-mail is still unconfirmed can ever obtain a
				// new session, whatever the client does.
				create: {
					async before(session, ctx) {
						if (!ctx) return;
						const user = (await ctx.context.internalAdapter.findUserById(
							session.userId,
						)) as { status?: string; emailVerified?: boolean } | null;
						const decision = evaluateSessionGate(user);
						if (!decision.allowed) {
							throw new APIError("FORBIDDEN", {
								message: decision.message,
								code: decision.code,
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
			// Cookies cross-origin: SPA frontend e API em origens distintas.
			// SameSite=None requer Secure=true (HTTPS). Mantido por necessidade
			// arquitetural; backend continua a ser fonte de verdade para validação.
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [
			expo(),
			/**
			 * E-mail OTP ("login com código"). The policy — generation,
			 * short expiry, attempt limit, resend rate limit, hashed storage and
			 * atomic single-use consumption — lives in `./otp`, and this is the
			 * only wiring: the code is rendered and delivered through
			 * `MailService.sendOtp`, fire-and-forget, so an SMTP failure can
			 * never break the auth flow.
			 */
			createEmailOtpPlugin(async ({ email, otp }) => {
				await MailService.sendOtp({ to: email, otp });
			}),
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

/**
 * The whole permission vocabulary is re-exported so server code has a single
 * import site, while the browser can import the dependency-free
 * `@muxima/permissions` package directly (it must never pull in Prisma).
 */
export * from "@muxima/permissions";
export type {
	AccessRole,
	AccessRoleId,
	Permission,
	UserAccess,
} from "./access";
export {
	ACCESS_ROLES,
	ALL_PERMISSIONS,
	EMPTY_ACCESS,
	getRolePermissions,
	getSeedRolePermissions,
	getUserAccess,
	hasPermission,
	isPermission,
	PERMISSIONS,
	permissionName,
	ROLE_DESCRIPTIONS,
	resolvePermissions,
	resolvePermissionsFromDatabase,
	splitPermission,
	toAccessRoleId,
	toAccessRoles,
} from "./access";
export {
	buildVerificationUrl,
	EMAIL_VERIFICATION_EXPIRES_IN_MINUTES,
	EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
	EMAIL_VERIFICATION_PATH,
	type EmailVerificationOptions,
	emailVerificationOptions,
	type VerificationDelivery,
} from "./email-verification";
export {
	BLOCKED_USER_MESSAGE,
	evaluateSessionGate,
	UNVERIFIED_USER_MESSAGE,
} from "./session-gate";
