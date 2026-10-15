import type { User } from "better-auth";

/**
 * E-mail confirmation policy for new accounts.
 *
 * The policy lives here — separate from the auth instance — so it can be
 * asserted by tests without instantiating Prisma or a real SMTP transport.
 * `createAuth` only injects the delivery function and the public web origin;
 * every security knob is a named constant below.
 */

/** 1 hour: long enough to read the inbox, short enough to limit exposure. */
export const EMAIL_VERIFICATION_EXPIRES_IN_SECONDS = 60 * 60;

/** Human-readable counterpart used in the e-mail copy. */
export const EMAIL_VERIFICATION_EXPIRES_IN_MINUTES =
	EMAIL_VERIFICATION_EXPIRES_IN_SECONDS / 60;

/** Frontend route the verification link points at. */
export const EMAIL_VERIFICATION_PATH = "/verify-email";

/** How the caller delivers one verification link (app passes `MailService`). */
export type VerificationDelivery = (input: {
	email: string;
	name?: string;
	verifyUrl: string;
	expiresInMinutes: number;
}) => void | Promise<void>;

/** The Better Auth `emailVerification` options object with Muxima's policy. */
export type EmailVerificationOptions = {
	expiresIn: number;
	sendOnSignUp: boolean;
	autoSignInAfterVerification: boolean;
	sendVerificationEmail: (data: {
		user: User;
		url: string;
		token: string;
	}) => Promise<void>;
};

/**
 * Builds the frontend URL the e-mail links to. The token travels as a query
 * parameter — the page calls `authClient.verifyEmail({ query: { token } })`,
 * never the Better Auth default link, so the copy and the UI stay Muxima's.
 */
export function buildVerificationUrl(
	frontendUrl: string,
	token: string,
): string {
	const base = frontendUrl.replace(/\/+$/, "");
	const params = new URLSearchParams({ token });
	return `${base}${EMAIL_VERIFICATION_PATH}?${params.toString()}`;
}

/**
 * Muxima's e-mail confirmation policy as raw Better Auth options:
 *
 * - token valid for 1 hour;
 * - sent automatically on sign-up (`sendOnSignUp`);
 * - the account is signed in right after the link is followed
 *   (`autoSignInAfterVerification`), so confirming from the inbox is enough;
 * - delivery is injected, so this module never imports the mailer.
 *
 * `emailAndPassword.requireEmailVerification` (set in `createAuth`) is what
 * actually keeps the account inactive until the link is followed.
 */
export function emailVerificationOptions({
	frontendUrl,
	deliver,
}: {
	frontendUrl: string;
	deliver: VerificationDelivery;
}): EmailVerificationOptions {
	return {
		expiresIn: EMAIL_VERIFICATION_EXPIRES_IN_SECONDS,
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		async sendVerificationEmail({ user, token }) {
			await deliver({
				email: user.email,
				name: user.name,
				verifyUrl: buildVerificationUrl(frontendUrl, token),
				expiresInMinutes: EMAIL_VERIFICATION_EXPIRES_IN_MINUTES,
			});
		},
	};
}
