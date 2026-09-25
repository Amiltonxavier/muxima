import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@muxima/env/server", () => ({
	env: {
		DATABASE_URL: "postgresql://test:test@localhost:5432/test",
		BETTER_AUTH_SECRET: "test-secret-key-at-least-32-characters-long!!",
		BETTER_AUTH_URL: "http://localhost:3000",
		CORS_ORIGIN: "http://localhost:3001",
		NODE_ENV: "test",
	},
}));

vi.mock("@muxima/auth", () => ({
	auth: {
		handler: vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
	},
}));

vi.mock("@muxima/db", () => ({
	default: {},
	createPrismaClient: vi.fn().mockReturnValue({}),
}));

describe("API App", () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		const { buildApp } = await import("../app");
		app = await buildApp();
	});

	afterAll(async () => {
		await app.close();
	});

	describe("Health check", () => {
		it("GET / should return OK", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/",
			});

			expect(response.statusCode).toBe(200);
			expect(response.body).toBe("OK");
		});
	});

	describe("Rate limiting", () => {
		it("should include rate-limit headers", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/",
			});

			expect(response.headers["x-ratelimit-limit"]).toBeDefined();
			expect(response.headers["x-ratelimit-remaining"]).toBeDefined();
		});
	});

	describe("CORS", () => {
		it("should include CORS headers on preflight request", async () => {
			const response = await app.inject({
				method: "OPTIONS",
				url: "/",
				headers: {
					origin: "http://localhost:3001",
					"access-control-request-method": "GET",
				},
			});

			expect(response.headers["access-control-allow-origin"]).toBeDefined();
			expect(response.headers["access-control-allow-methods"]).toBeDefined();
		});

		it("should include CORS headers on regular GET request", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/",
				headers: {
					origin: "http://localhost:3001",
				},
			});

			expect(response.headers["access-control-allow-origin"]).toBeDefined();
		});
	});
});
