import { emailOTP } from "better-auth/plugins";

/**
 * Login-with-code (OTP) policy.
 *
 * The policy lives here — separate from the auth instance — so it can be
 * asserted by tests without instantiating Prisma or a real SMTP transport.
 * `createAuth` only wires the delivery function in; every security knob is a
 * named constant below.
 */

/** 6 characters: long enough to be hard to guess, short enough to type. */
export const OTP_LENGTH = 6;

/** Short expiry: the code stops working after 5 minutes. */
export const OTP_EXPIRES_IN_SECONDS = 300;

/** Wrong guesses allowed per code before it locks the identifier out. */
export const OTP_ALLOWED_ATTEMPTS = 5;

/** Resend throttle: at most 3 codes per minute per identifier. */
export const OTP_RESEND_LIMIT = { windowSeconds: 60, max: 3 } as const;

/** How the caller delivers one code (the app passes `MailService.sendOtp`). */
export type OtpDelivery = (input: {
	email: string;
	otp: string;
}) => void | Promise<void>;

/** The Better Auth `emailOTP` options object with Muxima's policy. */
export type EmailOtpOptions = Parameters<typeof emailOTP>[0];

/**
 * Muxima's login-with-code policy as raw plugin options:
 *
 * - cryptographically secure 6-digit code (Better Auth's CSPRNG generator);
 * - 5-minute expiry;
 * - 5 attempts per code, then the identifier is locked;
 * - resend rate limit (3/minute) enforced by Better Auth's rate limiter;
 * - code stored **hashed** (never in clear text) with an attempt counter;
 * - `resendStrategy: "rotate"` — a new code invalidates the previous one;
 * - the OTP is consumed atomically on success, so it can never be replayed;
 * - `disableSignUp` — a code never creates an account silently.
 *
 * Exported as options (not only as a plugin) so tests can re-assemble the
 * same policy with a relaxed throttle when they need many attempts.
 */
export function emailOtpOptions(deliver: OtpDelivery): EmailOtpOptions {
	return {
		otpLength: OTP_LENGTH,
		expiresIn: OTP_EXPIRES_IN_SECONDS,
		allowedAttempts: OTP_ALLOWED_ATTEMPTS,
		rateLimit: {
			window: OTP_RESEND_LIMIT.windowSeconds,
			max: OTP_RESEND_LIMIT.max,
		},
		// Nunca se guarda o código em claro na base de dados.
		storeOTP: "hashed",
		// Cada pedido gera um código novo (o anterior deixa de servir).
		resendStrategy: "rotate",
		// Só contas existentes: o OTP nunca cria contas em silêncio.
		disableSignUp: true,
		sendVerificationOTP: async ({ email, otp }) => {
			await deliver({ email, otp });
		},
	};
}

/**
 * Builds the Better Auth `emailOTP` plugin with Muxima's policy.
 *
 * Delivery is injected: this module never imports the mailer, so the policy
 * stays testable and the auth instance owns the SMTP wiring.
 */
export function createEmailOtpPlugin(deliver: OtpDelivery) {
	return emailOTP(emailOtpOptions(deliver));
}
