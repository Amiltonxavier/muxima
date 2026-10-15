import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Transport options are the only place provider settings exist, so they are
 * asserted directly: a regression here (dropping TLS, a timeout, or the auth
 * block) would only surface as a silent non-delivery in production.
 */
const mailEnv = vi.hoisted(() => ({
	MAIL_HOST: undefined as string | undefined,
	MAIL_PORT: 587 as number,
	MAIL_USER: undefined as string | undefined,
	MAIL_PASSWORD: undefined as string | undefined,
	MAIL_FROM: undefined as string | undefined,
	MAIL_SECURE: undefined as "true" | "false" | undefined,
	MAIL_REQUIRE_TLS: undefined as "true" | "false" | undefined,
}));

vi.mock("@muxima/env/server", () => ({ env: mailEnv }));

const { buildMailerConfig, mailFrom, MAIL_TIMEOUTS } = await import(
	"./mailer-config"
);

beforeEach(() => {
	mailEnv.MAIL_HOST = undefined;
	mailEnv.MAIL_PORT = 587;
	mailEnv.MAIL_USER = undefined;
	mailEnv.MAIL_PASSWORD = undefined;
	mailEnv.MAIL_FROM = undefined;
	mailEnv.MAIL_SECURE = undefined;
	mailEnv.MAIL_REQUIRE_TLS = undefined;
});

describe("buildMailerConfig", () => {
	it("disables mail entirely (null) when MAIL_HOST is absent", () => {
		expect(buildMailerConfig()).toBeNull();
	});

	it("uses STARTTLS (secure:false, requireTLS:true) on port 587", () => {
		mailEnv.MAIL_HOST = "smtp.example.com";
		const config = buildMailerConfig();

		expect(config).toMatchObject({
			host: "smtp.example.com",
			port: 587,
			secure: false,
			requireTLS: true,
			connectionTimeout: MAIL_TIMEOUTS.connection,
			greetingTimeout: MAIL_TIMEOUTS.greeting,
			socketTimeout: MAIL_TIMEOUTS.socket,
			tls: { minVersion: "TLSv1.2" },
		});
	});

	it("uses implicit TLS on port 465", () => {
		mailEnv.MAIL_HOST = "smtp.example.com";
		mailEnv.MAIL_PORT = 465;
		const config = buildMailerConfig();

		expect(config).toMatchObject({ secure: true, requireTLS: false });
	});

	it("honours MAIL_SECURE and MAIL_REQUIRE_TLS overrides", () => {
		mailEnv.MAIL_HOST = "smtp.example.com";
		mailEnv.MAIL_SECURE = "true";
		mailEnv.MAIL_REQUIRE_TLS = "false";

		expect(buildMailerConfig()).toMatchObject({
			secure: true,
			requireTLS: false,
		});
	});

	it("only includes an auth block when MAIL_USER is set", () => {
		mailEnv.MAIL_HOST = "smtp.example.com";
		expect(buildMailerConfig()).not.toHaveProperty("auth");

		mailEnv.MAIL_USER = "user";
		mailEnv.MAIL_PASSWORD = "secret";
		expect(buildMailerConfig()).toMatchObject({
			auth: { user: "user", pass: "secret" },
		});
	});
});

describe("mailFrom", () => {
	it("defaults to a Muxima identity when MAIL_FROM is absent", () => {
		expect(mailFrom()).toBe('"Muxima" <no-reply@muxima.test>');
	});

	it("prefers the configured MAIL_FROM", () => {
		mailEnv.MAIL_FROM = "Muxima <hello@example.com>";
		expect(mailFrom()).toBe("Muxima <hello@example.com>");
	});
});
