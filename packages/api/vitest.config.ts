import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"@muxima/env/server": path.resolve(__dirname, "../env/src/server.ts"),
			"@muxima/auth": path.resolve(__dirname, "../auth/src/index.ts"),
			"@muxima/db": path.resolve(__dirname, "../db/src/index.ts"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
	},
});
