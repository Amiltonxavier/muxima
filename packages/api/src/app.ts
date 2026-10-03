import fastifyCors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { auth } from "@muxima/auth";
import { env } from "@muxima/env/server";
import type { FastifyInstance } from "fastify";
import { registerRoutes } from "./routes";
import { authMiddleware } from "./shared/auth/auth-middleware";
import { mapBetterAuthError } from "./shared/auth/better-auth-error";
import { ERROR_CODES } from "./shared/errors/codes";
import {
	errorEnvelope,
	errorHandler,
	notFoundHandler,
} from "./shared/errors/error-handler";
import { errorResponse } from "./shared/http/response";

export async function buildApp(): Promise<FastifyInstance> {
	const fastify = (await import("fastify")).default({
		logger: true,
	});

	// CORS
	await fastify.register(fastifyCors, {
		origin: env.CORS_ORIGIN,
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
		credentials: true,
		maxAge: 86400,
	});

	// Rate limiting
	await fastify.register(rateLimit, {
		max: 100,
		timeWindow: "1 minute",
	});

	// Global error handler + 404 envelope for unmatched routes
	fastify.setErrorHandler(errorHandler);
	fastify.setNotFoundHandler(notFoundHandler);

	// Auth middleware on all /api/v1 routes
	fastify.addHook("preHandler", async (request, reply) => {
		if (request.url.startsWith("/api/v1/")) {
			await authMiddleware(request, reply);
		}
	});

	// Better Auth handler (stricter rate limit for auth endpoints)
	fastify.route({
		method: ["GET", "POST"],
		url: "/api/auth/*",
		config: {
			rateLimit: {
				max: 20,
				timeWindow: "1 minute",
			},
		},
		async handler(request, reply) {
			try {
				const url = new URL(request.url, `http://${request.headers.host}`);
				const headers = new Headers();
				Object.entries(request.headers).forEach(([key, value]) => {
					if (value) headers.append(key, value.toString());
				});
				const req = new Request(url.toString(), {
					method: request.method,
					headers,
					body: request.body ? JSON.stringify(request.body) : undefined,
				});
				const response = await auth.handler(req);
				reply.status(response.status);
				response.headers.forEach((value, key) => {
					reply.header(key, value);
				});

				const body = response.body ? await response.text() : null;
				if (response.ok || !body) {
					reply.send(body);
					return;
				}

				// Better Auth answered with an error: translate it into the
				// official envelope (stable public code + PT-PT message) while
				// preserving the status and headers it produced (cookies, etc.).
				const appError = mapBetterAuthError(
					parseJsonBody(body),
					response.status,
				);
				reply.status(appError.statusCode).send(errorEnvelope(appError));
			} catch (error) {
				fastify.log.error({ err: error }, "Authentication Error:");
				// Return 401 so the frontend can distinguish "no session" from
				// a real server error (500). Without this, a transient DB
				// failure would cause the frontend to treat it as "logged out"
				// and redirect to /login.
				reply
					.status(401)
					.send(
						errorResponse(
							ERROR_CODES.UNAUTHORIZED,
							"Não foi possível validar a sessão. Tente novamente.",
						),
					);
			}
		},
	});

	// Health check
	fastify.get("/", async () => "OK");

	// Register all module REST routes
	await registerRoutes(fastify);

	return fastify;
}

/** Parses a response body without ever throwing (Better Auth always sends JSON here). */
function parseJsonBody(body: string): {
	error?: { code?: unknown; message?: unknown; status?: unknown };
	code?: unknown;
	message?: unknown;
	status?: unknown;
} | null {
	try {
		const parsed = JSON.parse(body);
		return typeof parsed === "object" && parsed !== null ? parsed : null;
	} catch {
		return null;
	}
}
