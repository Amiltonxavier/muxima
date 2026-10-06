import { buildApp } from "@muxima/api/app";
import { createContext } from "@muxima/api/context";
import { startEventLifecycleWorker } from "@muxima/api/jobs/event-lifecycle";
import { appRouter } from "@muxima/api/routers/index";
import { NotFoundError } from "@muxima/api/shared/errors/app-error";
import { ERROR_CODES } from "@muxima/api/shared/errors/codes";
import { errorEnvelope } from "@muxima/api/shared/errors/error-handler";
import { OpenAPIHandler } from "@orpc/openapi/fastify";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fastify";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";

async function main() {
	const fastify = await buildApp();

	// oRPC handlers (kept for frontend compatibility)
	const rpcHandler = new RPCHandler(appRouter, {
		interceptors: [
			onError((error) => {
				fastify.log.error({ err: error }, "oRPC handler error");
			}),
		],
	});

	const apiHandler = new OpenAPIHandler(appRouter, {
		plugins: [
			new OpenAPIReferencePlugin({
				schemaConverters: [new ZodToJsonSchemaConverter()],
			}),
		],
		interceptors: [
			onError((error) => {
				fastify.log.error({ err: error }, "OpenAPI handler error");
			}),
		],
	});

	fastify.register(async (rpcApp) => {
		rpcApp.addContentTypeParser("*", (_, _payload, done) => {
			done(null, undefined);
		});

		rpcApp.all("/rpc/*", async (request, reply) => {
			const { matched } = await rpcHandler.handle(request, reply, {
				context: await createContext(request.headers, {
					ip: request.ip,
					reply,
				}),
				prefix: "/rpc",
			});
			if (!matched) reply.status(404).send(errorEnvelope(rpcNotFound()));
		});

		rpcApp.all("/api-reference/*", async (request, reply) => {
			const { matched } = await apiHandler.handle(request, reply, {
				context: await createContext(request.headers, {
					ip: request.ip,
					reply,
				}),
				prefix: "/api-reference",
			});
			if (!matched) reply.status(404).send(errorEnvelope(rpcNotFound()));
		});
	});

	// Coarse background worker for the event lifecycle + proximity
	// notifications (15 min interval, unref'd — never per-second work).
	startEventLifecycleWorker();

	await fastify.listen({ port: 3000, host: "0.0.0.0" });
	console.log("Server running on port 3000");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});

/** 404 for a procedure/route that does not exist in the oRPC router. */
function rpcNotFound() {
	return new NotFoundError("O procedimento solicitado não existe.", {
		code: ERROR_CODES.NOT_FOUND,
	});
}
