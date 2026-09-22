import { buildApp } from "@muxima/api/app";
import { createContext } from "@muxima/api/context";
import { appRouter } from "@muxima/api/routers/index";
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
				console.error(error);
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
				console.error(error);
			}),
		],
	});

	fastify.register(async (rpcApp) => {
		rpcApp.addContentTypeParser("*", (_, _payload, done) => {
			done(null, undefined);
		});

		rpcApp.all("/rpc/*", async (request, reply) => {
			const { matched } = await rpcHandler.handle(request, reply, {
				context: await createContext(request.headers, { ip: request.ip }),
				prefix: "/rpc",
			});
			if (!matched) reply.status(404).send();
		});

		rpcApp.all("/api-reference/*", async (request, reply) => {
			const { matched } = await apiHandler.handle(request, reply, {
				context: await createContext(request.headers, { ip: request.ip }),
				prefix: "/api-reference",
			});
			if (!matched) reply.status(404).send();
		});
	});

	await fastify.listen({ port: 3000, host: "0.0.0.0" });
	console.log("Server running on port 3000");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
