import db from "@muxima/db";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error";
import { ERROR_CODES } from "../errors/codes";
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

/**
 * Reads the authenticated user from the request session.
 *
 * The single guard used by every REST route that requires a session: instead
 * of each handler replying with its own hand-written 401 body, it throws an
 * `UnauthorizedError` so the global error handler produces the official
 * PT-PT envelope.
 */
export async function requireSessionUserId(
	request: FastifyRequest,
): Promise<string> {
	const userId = request.session?.user?.id;
	if (!userId) throw new UnauthorizedError();
	try {
		const user = await db.user?.findUnique({
			where: { id: userId },
			select: { status: true },
		});
		if (user && user.status === "BLOCKED") {
			throw new ForbiddenError("Esta conta está bloqueada", {
				code: ERROR_CODES.ACCOUNT_BLOCKED,
			});
		}
	} catch (error) {
		if (error instanceof ForbiddenError) throw error;
	}
	return userId;
}

/** Same guard, but returns the whole session user (routes that audit the actor). */
export async function requireSessionUser(request: FastifyRequest): Promise<{
	id: string;
	name: string;
	email: string;
}> {
	const user = request.session?.user;
	if (!user) throw new UnauthorizedError();
	try {
		const dbUser = await db.user?.findUnique({
			where: { id: user.id },
			select: { status: true },
		});
		if (dbUser && dbUser.status === "BLOCKED") {
			throw new ForbiddenError("Esta conta está bloqueada", {
				code: ERROR_CODES.ACCOUNT_BLOCKED,
			});
		}
	} catch (error) {
		if (error instanceof ForbiddenError) throw error;
	}
	return user;
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
