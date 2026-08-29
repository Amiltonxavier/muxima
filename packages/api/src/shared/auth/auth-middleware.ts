import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "./auth";

export async function authMiddleware(
	request: FastifyRequest,
	_reply: FastifyReply,
) {
	try {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});
		request.session = session;
	} catch {
		request.session = null;
	}
}

// Extend FastifyRequest type
declare module "fastify" {
	interface FastifyRequest {
		session: {
			session: {
				id: string;
				userId: string;
				expiresAt: Date;
				token: string;
			} | null;
			user: {
				id: string;
				name: string;
				email: string;
				image?: string | null;
			} | null;
		} | null;
	}
}
