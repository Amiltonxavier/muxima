import { expo } from "@better-auth/expo";
import { createPrismaClient } from "@muxima/db";
import { env } from "@muxima/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";

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
		plugins: [expo()],
	});
}

export const auth = createAuth();

export { BLOCKED_USER_MESSAGE };
