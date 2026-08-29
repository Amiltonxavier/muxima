import fastifyCors from "@fastify/cors";
import { auth } from "@muxima/auth";
import { env } from "@muxima/env/server";
import type { FastifyInstance } from "fastify";
import { registerRoutes } from "./routes";
import { authMiddleware } from "./shared/auth/auth-middleware";
import { errorHandler } from "./shared/errors/error-handler";

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

	// Global error handler
	fastify.setErrorHandler(errorHandler);

	// Auth middleware on all /api/v1 routes
	fastify.addHook("preHandler", async (request, reply) => {
		if (request.url.startsWith("/api/v1/")) {
			await authMiddleware(request, reply);
		}
	});

	// Better Auth handler
	fastify.route({
		method: ["GET", "POST"],
		url: "/api/auth/*",
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
				reply.send(response.body ? await response.text() : null);
			} catch (error) {
				fastify.log.error({ err: error }, "Authentication Error:");
				reply.status(500).send({
					error: "Internal authentication error",
					code: "AUTH_FAILURE",
				});
			}
		},
	});

	// Health check
	fastify.get("/", async () => "OK");

	// Register all module REST routes
	await registerRoutes(fastify);

	return fastify;
}
