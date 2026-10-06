import type { IncomingHttpHeaders } from "node:http";

import { auth } from "@muxima/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply } from "fastify";

export async function createContext(
	req: IncomingHttpHeaders,
	extra?: { ip?: string; reply?: FastifyReply },
) {
	// Kept on the context so procedures can call Better Auth's server API with
	// the caller's own credentials — changing a password, for instance, needs
	// the session cookie, not just the already-resolved session.
	const requestHeaders = fromNodeHeaders(req);
	const session = await auth.api.getSession({ headers: requestHeaders });
	const userAgent = req["user-agent"];

	return {
		auth: null,
		session,
		requestHeaders,
		ip: extra?.ip,
		// Provided by `apps/server` so the oRPC error mapper can set
		// `Retry-After` on 429 responses (the RPC surface does not go through
		// the REST error handler).
		reply: extra?.reply,
		userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
