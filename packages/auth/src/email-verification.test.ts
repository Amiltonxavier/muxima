import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { createEmailVerificationToken } from "better-auth/api";
import { describe, expect, it } from "vitest";
import {
	buildVerificationUrl,
	EMAIL_VERIFICATION_EXPIRES_IN_MINUTES,
	EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
	EMAIL_VERIFICATION_PATH,
	emailVerificationOptions,
	type VerificationDelivery,
} from "./email-verification";
import { evaluateSessionGate } from "./session-gate";

/**
 * E-mail confirmation policy, exercised through a real Better Auth instance
 * backed by the in-memory adapter — the same code paths production uses
 * (`internalAdapter`, the JWT verification token and the session hooks), minus
 * Prisma and SMTP.
 *
 * What is under test: sign-up stays inactive and mails one link, no session can
 * be created before confirmation (neither by sign-in nor by the session hook),
 * following the link activates the account and signs the user in, and the token
 * is time-bounded — expired, invalid and replayed tokens never yield a session.
 */

const EMAIL = "ana@muxima.test";
const PASSWORD = "SenhaForte123";
const SECRET = "test-secret-test-secret-test-secret-32";
const FRONTEND_URL = "http://localhost:3001";

function createWorld() {
	const delivered: {
		email: string;
		name?: string;
		verifyUrl: string;
		expiresInMinutes: number;
	}[] = [];
	const db: Record<string, unknown[]> = {
		user: [],
		session: [],
		verification: [],
		account: [],
	};

	const deliver: VerificationDelivery = (input) => {
		delivered.push(input);
	};

	const auth = betterAuth({
		baseURL: "http://localhost:3000",
		secret: SECRET,
		database: memoryAdapter(db),
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			autoSignIn: false,
		},
		emailVerification: emailVerificationOptions({
			frontendUrl: FRONTEND_URL,
			deliver,
		}),
		// Mirrors production: a session can never be created for a blocked or
		// unconfirmed account, whatever endpoint asked for it.
		databaseHooks: {
			session: {
				create: {
					async before(session, ctx) {
						if (!ctx) return;
						const user = (await ctx.context.internalAdapter.findUserById(
							session.userId,
						)) as { status?: string; emailVerified?: boolean } | null;
						const decision = evaluateSessionGate(user);
						if (!decision.allowed) {
							throw new Error(`gate:${decision.code}`);
						}
					},
				},
			},
		},
	});

	return {
		auth,
		delivered,
		get users() {
			return db.user as { email: string; emailVerified: boolean }[];
		},
		get sessions() {
			return db.session as { userId: string }[];
		},
		lastToken() {
			const url = delivered.at(-1)?.verifyUrl ?? "";
			return new URL(url).searchParams.get("token") ?? "";
		},
		signUp: () =>
			auth.api.signUpEmail({
				body: { email: EMAIL, password: PASSWORD, name: "Ana" },
			}),
		signIn: () =>
			auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } }),
		verify: (token: string) =>
			auth.api.verifyEmail({ query: { token } }) as Promise<{
				status?: boolean;
			}>,
		resend: () => auth.api.sendVerificationEmail({ body: { email: EMAIL } }),
	};
}

/** Captures a Better Auth `APIError` instead of letting it fail the test. */
async function capture(promise: Promise<unknown>) {
	try {
		await promise;
		return null;
	} catch (error) {
		const caught = error as {
			status?: string | number;
			body?: unknown;
			message?: string;
		};
		return {
			status: caught.status,
			message: caught.message,
			body: JSON.stringify(caught.body ?? {}),
			raw: error,
		};
	}
}

describe("verification policy constants", () => {
	it("bounds the link to one hour and points at the frontend route", () => {
		expect(EMAIL_VERIFICATION_EXPIRES_IN_SECONDS).toBe(60 * 60);
		expect(EMAIL_VERIFICATION_EXPIRES_IN_MINUTES).toBe(60);
		expect(EMAIL_VERIFICATION_PATH).toBe("/verify-email");
	});

	it("builds a tokenised URL against the frontend origin", () => {
		expect(buildVerificationUrl("https://app.muxima.test/", "abc 123")).toBe(
			"https://app.muxima.test/verify-email?token=abc+123",
		);
	});
});

describe("session gate", () => {
	it("blocks a blocked account", () => {
		const decision = evaluateSessionGate({ status: "BLOCKED" });
		expect(decision).toEqual(
			expect.objectContaining({ allowed: false, code: "ACCOUNT_BLOCKED" }),
		);
	});

	it("blocks an unconfirmed account", () => {
		const decision = evaluateSessionGate({ emailVerified: false });
		expect(decision).toEqual(
			expect.objectContaining({ allowed: false, code: "EMAIL_NOT_VERIFIED" }),
		);
	});

	it("allows confirmed accounts and rows without the flag", () => {
		expect(evaluateSessionGate({ emailVerified: true })).toEqual({
			allowed: true,
		});
		expect(evaluateSessionGate({ status: "ACTIVE" })).toEqual({
			allowed: true,
		});
		expect(evaluateSessionGate(null)).toEqual({ allowed: true });
	});
});

describe("registration", () => {
	it("keeps the account inactive, mails one link and opens no session", async () => {
		const world = createWorld();
		await world.signUp();

		expect(world.delivered).toHaveLength(1);
		expect(world.delivered[0]?.email).toBe(EMAIL);
		expect(world.delivered[0]?.verifyUrl).toContain(
			`${FRONTEND_URL}${EMAIL_VERIFICATION_PATH}?token=`,
		);
		expect(world.lastToken()).toBeTruthy();

		expect(world.users).toHaveLength(1);
		expect(world.users[0]?.emailVerified).toBe(false);
		expect(world.sessions).toHaveLength(0);
	});

	it("refuses to sign in before the e-mail is confirmed", async () => {
		const world = createWorld();
		await world.signUp();

		const error = await capture(world.signIn());
		expect(error).not.toBeNull();
		expect(error?.body).toContain("EMAIL_NOT_VERIFIED");
		expect(world.sessions).toHaveLength(0);
	});
});

describe("confirmation", () => {
	it("activates the account and signs the user in", async () => {
		const world = createWorld();
		await world.signUp();

		const result = await world.verify(world.lastToken());
		expect(result.status).toBe(true);
		expect(world.users[0]?.emailVerified).toBe(true);
		expect(world.sessions).toHaveLength(1);
	});

	it("does not mint a new session when the link is replayed", async () => {
		const world = createWorld();
		await world.signUp();
		const token = world.lastToken();

		await world.verify(token);
		const replay = await world.verify(token);

		// Idempotent: the second use confirms nothing new and, crucially, opens
		// no session — the session count is unchanged.
		expect(replay.status).toBe(true);
		expect(world.sessions).toHaveLength(1);
	});

	it("refuses an expired token", async () => {
		const world = createWorld();
		await world.signUp();

		const expired = await createEmailVerificationToken(
			SECRET,
			EMAIL,
			undefined,
			-10,
		);
		const error = await capture(world.verify(expired));
		expect(error?.body).toContain("TOKEN_EXPIRED");
		expect(world.users[0]?.emailVerified).toBe(false);
	});

	it("refuses a tampered or invalid token", async () => {
		const world = createWorld();
		await world.signUp();

		const error = await capture(world.verify("not-a-valid-token"));
		expect(error).not.toBeNull();
		expect(world.sessions).toHaveLength(0);
		expect(world.users[0]?.emailVerified).toBe(false);
	});

	it("issues a fresh working link on resend", async () => {
		const world = createWorld();
		await world.signUp();
		await world.resend();

		expect(world.delivered).toHaveLength(2);
		const result = await world.verify(world.lastToken());
		expect(result.status).toBe(true);
		expect(world.users[0]?.emailVerified).toBe(true);
	});
});
