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
	},
});
