import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { emailOTP } from "better-auth/plugins";
import { describe, expect, it } from "vitest";
import {
	createEmailOtpPlugin,
	emailOtpOptions,
	OTP_ALLOWED_ATTEMPTS,
	OTP_EXPIRES_IN_SECONDS,
	OTP_LENGTH,
	OTP_RESEND_LIMIT,
} from "./otp";

/**
 * Login-with-code policy, exercised through a real Better Auth instance
 * backed by the in-memory adapter — the same code paths production uses
 * (`internalAdapter` + the `verification` table), minus Prisma and SMTP.
 *
 * What is under test: generation, storage, validation, expiry, attempt
 * budget, resend throttle/rotation, single-use consumption and the fact that
 * error responses never echo the code.
 */

const EMAIL = "ana@muxima.test";
const PASSWORD = "SenhaForte123";

type VerificationRow = {
	id: string;
	value: string;
	identifier: string;
	expiresAt: Date;
};

function createWorld(email = EMAIL, config: { relaxRateLimit?: boolean } = {}) {
	const delivered: { email: string; otp: string }[] = [];
	const db: Record<string, unknown[]> = {
		user: [],
		session: [],
		verification: [],
		account: [],
	};

	const deliver = (input: { email: string; otp: string }) => {
		delivered.push(input);
	};
	// The throttle is asserted by its own test; the attempt-budget test needs
	// to burn more than `OTP_RESEND_LIMIT.max` sign-in calls in one minute, so
	// it re-assembles the *same* policy with a relaxed window only.
	const plugin = config.relaxRateLimit
		? emailOTP({
				...emailOtpOptions(deliver),
				rateLimit: { window: 60, max: 1_000 },
			})
		: createEmailOtpPlugin(deliver);

	const auth = betterAuth({
		baseURL: "http://localhost:3000",
		secret: "test-secret-test-secret-test-secret-32",
		database: memoryAdapter(db),
		emailAndPassword: { enabled: true },
		// Better Auth only enforces rate limits when they are on (they default
		// to on in production); tests opt in so the resend throttle is real.
		rateLimit: { enabled: true, window: 60, max: 1_000 },
		plugins: [plugin],
	});

	return {
		auth,
		delivered,
		// Read lazily: Better Auth may (re)initialise its tables on first
		// write, so a snapshot taken here could point at a stale array.
		get verification() {
			return db.verification as VerificationRow[];
		},
		signUp: () =>
			auth.api.signUpEmail({
				body: { email, password: PASSWORD, name: "Ana" },
			}),
		send: () =>
			auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } }),
		signIn: (otp: string) => auth.api.signInEmailOTP({ body: { email, otp } }),
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

describe("OTP policy constants", () => {
	it("matches the security requirements of the login flow", () => {
		expect(OTP_LENGTH).toBe(6);
		expect(OTP_EXPIRES_IN_SECONDS).toBeLessThanOrEqual(300);
		expect(OTP_ALLOWED_ATTEMPTS).toBeGreaterThanOrEqual(3);
		expect(OTP_RESEND_LIMIT.max).toBeLessThanOrEqual(3);
		expect(OTP_RESEND_LIMIT.windowSeconds).toBeLessThanOrEqual(60);
	});
});

describe("generation and storage", () => {
	it("generates a 6-digit numeric code and delivers it", async () => {
		const world = createWorld();
		await world.signUp();
		await world.send();

		expect(world.delivered).toHaveLength(1);
		expect(world.delivered[0]?.email).toBe(EMAIL);
		expect(world.delivered[0]?.otp).toMatch(/^\d{6}$/);
		expect(world.delivered[0]?.otp).toHaveLength(OTP_LENGTH);
	});

	it("never stores the code in clear text", async () => {
		const world = createWorld();
		await world.signUp();
		await world.send();

		const [row] = world.verification;
		expect(row).toBeDefined();
		const otp = world.delivered[0]?.otp ?? "";
		// `${hash}:${attempts}` — the code itself must not appear anywhere.
		expect(row?.value).toMatch(/^[^:]+:0$/);
		expect(row?.value).not.toContain(otp);
	});

	it("expires the code after the configured window", async () => {
		const world = createWorld();
		await world.signUp();
		await world.send();

		const [row] = world.verification;
		const ttl = (row?.expiresAt.getTime() ?? 0) - Date.now();
		expect(ttl).toBeGreaterThan(0);
		// Allow a little slack for the time the requests took.
		expect(ttl).toBeLessThanOrEqual(OTP_EXPIRES_IN_SECONDS * 1000 + 5_000);
	});
});

describe("validation", () => {
	it("signs the user in with the correct code", async () => {
		const world = createWorld();
		await world.signUp();
		await world.send();

		const result = await world.signIn(world.delivered[0]?.otp ?? "");
		expect(result).toMatchObject({
			user: { email: EMAIL },
		});
		expect(result.token).toBeTruthy();
	});

	it("rejects a wrong code without leaking the right one", async () => {
		const world = createWorld();
		await world.signUp();
		await world.send();
		const real = world.delivered[0]?.otp ?? "";
		const wrong = real === "999999" ? "111111" : "999999";

		const error = await capture(world.signIn(wrong));
		expect(error).not.toBeNull();
		expect(error?.body).toContain("INVALID_OTP");
		// The response must never echo the valid code.
		expect(error?.body).not.toContain(real);
		expect(error?.message ?? "").not.toContain(real);
	});

	it("rejects an expired code", async () => {
		const world = createWorld();
		await world.signUp();
		await world.send();

		const [row] = world.verification;
		if (row) row.expiresAt = new Date(Date.now() - 1_000);

		const error = await capture(world.signIn(world.delivered[0]?.otp ?? ""));
		expect(error?.body).toContain("OTP_EXPIRED");
	});

	it("consumes the code — it can never be replayed", async () => {
		const world = createWorld();
		await world.signUp();
		await world.send();
		const otp = world.delivered[0]?.otp ?? "";

		const first = await world.signIn(otp);
		expect(first).toMatchObject({ user: { email: EMAIL } });

		const replay = await capture(world.signIn(otp));
		expect(replay).not.toBeNull();
		expect(replay?.body).not.toContain("token");
	});

	it("locks the code after the attempt budget is exhausted", async () => {
		const world = createWorld(EMAIL, { relaxRateLimit: true });
		await world.signUp();
		await world.send();
		const otp = world.delivered[0]?.otp ?? "";
		const wrong = otp === "999999" ? "111111" : "999999";

		for (let attempt = 0; attempt < OTP_ALLOWED_ATTEMPTS; attempt += 1) {
			const error = await capture(world.signIn(wrong));
			expect(error?.body).toContain("INVALID_OTP");
		}

		// Even the *correct* code is refused now.
		const locked = await capture(world.signIn(otp));
		expect(locked).not.toBeNull();
		expect(locked?.body).toContain("TOO_MANY_ATTEMPTS");
	});
});

describe("resend", () => {
	it("rotates: a new code invalidates the previous one", async () => {
		const world = createWorld();
		await world.signUp();
		await world.send();
		// Production resends are seconds apart; the gap keeps the two codes'
		// `createdAt` distinct so "latest wins" is unambiguous.
		await new Promise((resolve) => setTimeout(resolve, 15));
		await world.send();

		expect(world.delivered).toHaveLength(2);
		const [first, second] = [world.delivered[0]?.otp, world.delivered[1]?.otp];
		expect(first).toBeTruthy();
		expect(second).toBeTruthy();

		const stale = await capture(world.signIn(String(first)));
		expect(stale).not.toBeNull();

		const fresh = await world.signIn(String(second));
		expect(fresh).toMatchObject({ user: { email: EMAIL } });
	});

	it("throttles resends within the rate-limit window", async () => {
		const world = createWorld();
		await world.signUp();

		// Rate limiting lives in Better Auth's HTTP pipeline (the same one the
		// web client hits), so the requests go through `auth.handler`.
		const post = () =>
			world.auth.handler(
				new Request(
					"http://localhost:3000/api/auth/email-otp/send-verification-otp",
					{
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ email: EMAIL, type: "sign-in" }),
					},
				),
			);

		const statuses: number[] = [];
		for (let attempt = 0; attempt <= OTP_RESEND_LIMIT.max; attempt += 1) {
			statuses.push((await post()).status);
		}

		// The first `max` codes go out; the next request in the same window is
		// refused by the throttle instead of mailing another code.
		expect(statuses.slice(0, OTP_RESEND_LIMIT.max)).toEqual(
			Array.from({ length: OTP_RESEND_LIMIT.max }, () => 200),
		);
		expect(statuses.at(-1)).toBe(429);
	});
});

describe("account protection", () => {
	it("never creates an account and never mails an unknown address", async () => {
		const world = createWorld("ninguem@muxima.test");

		// No sign-up: the address does not exist.
		await world.send();
		// The plugin deletes the code for unknown users and answers `success`
		// anyway, so the response cannot be used to enumerate accounts.
		expect(world.delivered).toHaveLength(0);
		expect(world.verification).toHaveLength(0);

		const error = await capture(world.signIn("123456"));
		expect(error).not.toBeNull();
	});
});
