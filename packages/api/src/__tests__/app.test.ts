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

const getSession = vi.fn().mockResolvedValue(null);

vi.mock("@muxima/auth", () => ({
	auth: {
		handler: vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
		api: {
			getSession: (...args: unknown[]) => getSession(...args),
		},
	},
	BLOCKED_USER_MESSAGE: "A tua conta está bloqueada.",
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

	describe("Official error envelope", () => {
		it("answers 401 with the official envelope when there is no session", async () => {
			getSession.mockResolvedValueOnce(null);

			const response = await app.inject({
				method: "GET",
				url: "/api/v1/events",
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toEqual({
				error: {
					code: "UNAUTHORIZED",
					message: "É necessário iniciar sessão para continuar.",
				},
			});
		});

		it("answers 404 with the official envelope for an unknown route", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/v1/rota-que-nao-existe",
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toEqual({
				error: {
					code: "NOT_FOUND",
					message: "O recurso solicitado não existe ou foi removido.",
				},
			});
		});

		it("answers 422 with details.issues for an invalid query filter", async () => {
			getSession.mockResolvedValueOnce({
				session: { id: "s1", userId: "u1", expiresAt: new Date(), token: "t" },
				user: { id: "u1", name: "Ana", email: "ana@example.com" },
			});

			const response = await app.inject({
				method: "GET",
				url: "/api/v1/events?status=NAO_EXISTE",
			});

			expect(response.statusCode).toBe(422);
			expect(response.json()).toEqual({
				error: {
					code: "VALIDATION_ERROR",
					message: "Os dados enviados são inválidos.",
					details: {
						issues: [{ path: "status", message: "Valor inválido." }],
					},
				},
			});
		});

		it("masks unexpected server failures", async () => {
			getSession.mockResolvedValueOnce({
				session: { id: "s1", userId: "u1", expiresAt: new Date(), token: "t" },
				user: { id: "u1", name: "Ana", email: "ana@example.com" },
			});

			// `db` is mocked as an empty object, so the repository call throws and
			// the client must never see that original failure.
			const response = await app.inject({
				method: "GET",
				url: "/api/v1/events",
			});

			expect(response.statusCode).toBe(500);
			expect(response.json()).toEqual({
				error: {
					code: "INTERNAL_SERVER_ERROR",
					message: "Ocorreu um erro interno. Tente novamente mais tarde.",
				},
			});
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
