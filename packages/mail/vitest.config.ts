import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"@muxima/env/server": path.resolve(__dirname, "../env/src/server.ts"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		// The mail layer imports `@muxima/env/server`, which validates the whole
		// server env at import time. These are placeholders used only to satisfy
		// that validation; the mail tests never connect to a real SMTP server.
		env: {
			DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/muxima_test",
			BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
			BETTER_AUTH_URL: "http://localhost:3000",
			CORS_ORIGIN: "http://localhost:3001",
			MAIL_HOST: "smtp.ethereal.email",
			MAIL_PORT: "587",
			MAIL_USER: "test-user",
			MAIL_PASSWORD: "test-password",
			MAIL_FROM: "Muxima <no-reply@muxima.test>",
		},
	},
});
