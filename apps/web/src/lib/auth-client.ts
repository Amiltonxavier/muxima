import { env } from "@muxima/env/web";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

function getServerUrl(url: string) {
	const processEnv = (
		globalThis as {
			process?: { env?: Record<string, string | undefined> };
		}
	).process?.env;
	if (typeof window === "undefined" && processEnv?.SERVER_URL) {
		return processEnv.SERVER_URL.endsWith("/")
			? processEnv.SERVER_URL.slice(0, -1)
			: processEnv.SERVER_URL;
	}

	const normalized = url.endsWith("/") ? url.slice(0, -1) : url;

	if (!normalized.startsWith("/")) {
		return normalized;
	}

	if (typeof window !== "undefined") {
		return `${window.location.origin}${normalized}`;
	}

	const vercelUrl =
		processEnv?.VERCEL_ENV === "production"
			? (processEnv?.VERCEL_PROJECT_PRODUCTION_URL ?? processEnv?.VERCEL_URL)
			: (processEnv?.VERCEL_URL ?? processEnv?.VERCEL_PROJECT_PRODUCTION_URL);
	if (vercelUrl) {
		const origin = vercelUrl.startsWith("http")
			? vercelUrl
			: `https://${vercelUrl}`;
		return `${origin}${normalized}`;
	}

	return `http://localhost:3000${normalized}`;
}
export const authClient = createAuthClient({
	// better-auth derives its route-matching base from this URL's path, so the
	// public auth path must equal the server-side mount (/api/auth everywhere)
	baseURL: new URL("/api/auth", getServerUrl(env.VITE_SERVER_URL)).toString(),
	plugins: [emailOTPClient()],
});

/**
 * e-mail OTP wrappers.
 *
 * The 1.7.1 client plugin registers the methods at runtime
 * (`authClient.emailOtp.sendVerificationOtp`, `authClient.signIn.emailOtp`,
 * routed to `/email-otp/send-verification-otp` and `/sign-in/email-otp`) but
 * ships an empty `$InferServerPlugin`, so TypeScript cannot see them. These
 * narrow the result to what the endpoints actually return, keeping the cast on
 * this single boundary instead of leaking `any` into call sites.
 */
type OtpResult<Data> = {
	data?: Data;
	error?: unknown;
};

export function requestSignInOtp(
	email: string,
): Promise<OtpResult<{ success: boolean }>> {
	return (
		authClient.emailOtp as unknown as {
			sendVerificationOtp: (input: {
				email: string;
				type: "sign-in";
			}) => Promise<{
				data?: { success: boolean };
				error?: unknown;
			}>;
		}
	).sendVerificationOtp({ email, type: "sign-in" });
}

export function verifySignInOtp(
	email: string,
	otp: string,
): Promise<OtpResult<{ token: string; user: unknown }>> {
	return (
		authClient.signIn as unknown as {
			emailOtp: (input: { email: string; otp: string }) => Promise<{
				data?: { token: string; user: unknown };
				error?: unknown;
			}>;
		}
	).emailOtp({ email, otp });
}

/**
 * Confirms an account from the token carried by the verification e-mail link.
 * The server marks the address verified and, because
 * `autoSignInAfterVerification` is on, opens the session in the same response.
 */
export function verifyAccountEmail(token: string) {
	return authClient.verifyEmail({ query: { token } });
}

/**
 * Re-sends the confirmation link for an address that has not been confirmed
 * yet. Safe to call for unknown/already-verified addresses: the server answers
 * `success` regardless, so the endpoint cannot be used to enumerate accounts.
 */
export function resendVerificationEmail(email: string) {
	return authClient.sendVerificationEmail({ email });
}
