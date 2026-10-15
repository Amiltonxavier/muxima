import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		// Unit tests never touch a real database or a real auth instance, but
		// the modules under test import `@muxima/env/server` (and, for the
		// wiring test, `@muxima/mail`), which validate `process.env` at import
		// time. These values are placeholders used only to satisfy that
		// validation — `@muxima/db` is mocked in the tests that need it.
		env: {
			DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/muxima_test",
			BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
			BETTER_AUTH_URL: "http://localhost:3000",
			CORS_ORIGIN: "http://localhost:3001",
			MAIL_HOST: "smtp.ethereal.email",
			MAIL_PORT: "587",
			MAIL_USER: "test@example.com",
			MAIL_PASSWORD: "test",
			MAIL_FROM: '"Muxima" <no-reply@muxima.test>',
			MAIL_SECURE: "false",
		},
	},
});
