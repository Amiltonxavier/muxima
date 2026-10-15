import { env } from "@muxima/env/server";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

/**
 * SMTP configuration for Nodemailer, built from the validated environment.
 *
 * The sole responsibility of this module is turning `MAIL_*` env vars into a
 * transport config — providers can be swapped (Ethereal in dev, a real SMTP in
 * production) without touching a single line of business logic.
 */
export type MailerConfig = SMTPTransport.Options;

/**
 * Hard upper bounds for each SMTP phase (ms). A black-holed port or a provider
 * that opens the socket then never answers must fail with a reportable error
 * instead of hanging the caller forever — `deliverMail` promises to always
 * settle. Values are deliberately generous for slow networks but finite.
 */
export const MAIL_TIMEOUTS = {
	connection: 15_000,
	greeting: 10_000,
	socket: 30_000,
} as const;

/**
 * Returns the transport options, or `null` when mail is disabled (no
 * `MAIL_HOST`). `null` means the mailer references no SMTP credentials at all.
 */
export function buildMailerConfig(): MailerConfig | null {
	if (!env.MAIL_HOST) return null;

	// STARTTLS (587) by default; explicit `MAIL_SECURE` wins when present;
	// port 465 implies immediate TLS (the `secure: true` convention).
	const secure = env.MAIL_SECURE === "true" || env.MAIL_PORT === 465;
	// `MAIL_REQUIRE_TLS` lets a local capture server (Mailpit/MailHog, no
	// STARTTLS) opt out explicitly; otherwise an insecure transport is refused
	// so credentials are never sent in the clear.
	const requireTLS = env.MAIL_REQUIRE_TLS
		? env.MAIL_REQUIRE_TLS === "true"
		: !secure;

	return {
		host: env.MAIL_HOST,
		port: env.MAIL_PORT,
		secure,
		...(env.MAIL_USER
			? { auth: { user: env.MAIL_USER, pass: env.MAIL_PASSWORD ?? "" } }
			: {}),
		connectionTimeout: MAIL_TIMEOUTS.connection,
		greetingTimeout: MAIL_TIMEOUTS.greeting,
		socketTimeout: MAIL_TIMEOUTS.socket,
		requireTLS,
		tls: { minVersion: "TLSv1.2" },
	};
}

/** Bounces nothing silently: the `From` identity is env-driven, never hardcoded. */
export function mailFrom(): string {
	return env.MAIL_FROM ?? '"Muxima" <no-reply@muxima.test>';
}
