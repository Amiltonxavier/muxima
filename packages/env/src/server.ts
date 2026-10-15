import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		/**
		 * Public origin of the web app. Used to build the public invitation URL
		 * that the guest QR Code points to. Falls back to CORS_ORIGIN.
		 */
		FRONTEND_URL: z.url().optional(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		/**
		 * SMTP e-mail provider (Nodemailer). The mailer is DISABLED when
		 * `MAIL_HOST` is absent — every `send*` becomes a no-op that logs and
		 * returns `SMTP_NOT_CONFIGURED`, so business operations never depend on
		 * mail being configured. Swap hosts (Ethereal in dev, any provider in
		 * production) without touching business logic.
		 */
		MAIL_HOST: z.string().optional(),
		MAIL_PORT: z.coerce.number().int().min(1).max(65535).default(587),
		MAIL_USER: z.string().optional(),
		MAIL_PASSWORD: z.string().optional(),
		MAIL_FROM: z.string().optional(),
		/** Explicit TLS flag; when absent it follows the port (`465` ⇒ `true`). */
		MAIL_SECURE: z.enum(["true", "false"]).optional(),
		/**
		 * Force a STARTTLS upgrade on a non-secure port (default `true`).
		 * Set to `false` only for a local capture server without TLS.
		 */
		MAIL_REQUIRE_TLS: z.enum(["true", "false"]).optional(),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
