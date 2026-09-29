import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"@muxima/env/server": path.resolve(__dirname, "../env/src/server.ts"),
			"@muxima/auth": path.resolve(__dirname, "../auth/src/index.ts"),
			// Longer paths first: a bare "@muxima/db" alias would otherwise
			// rewrite "@muxima/db/prisma" into "<file>/prisma".
			"@muxima/db/prisma": path.resolve(
				__dirname,
				"../db/prisma/generated/client.ts",
			),
			"@muxima/db": path.resolve(__dirname, "../db/src/index.ts"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		// Unit tests never touch a real database or a real auth instance, but
		// the modules under test import `@muxima/env/server`, which validates
		// `process.env` at import time. These values are placeholders used only
		// to satisfy that validation.
		env: {
			DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/muxima_test",
			BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
			BETTER_AUTH_URL: "http://localhost:3000",
			CORS_ORIGIN: "http://localhost:3001",
		},
	},
});
