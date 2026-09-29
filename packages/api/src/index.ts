import { BLOCKED_USER_MESSAGE } from "@muxima/auth";

import db from "@muxima/db";
import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";
import { AppError } from "./shared/errors/app-error";
import { mapError } from "./shared/errors/map-error";

export const o = os.$context<Context>();

/**
 * Central error mapping for every oRPC procedure:
 * - `AppError`s (NotFound, Forbidden, …) become ORPC errors with their
 *   original status/code/message.
 * - Prisma errors (P2022/P2025/P2002/P2003), Zod errors and unexpected
 *   errors are mapped to safe, user-facing messages — internal details
 *   (stack, SQL, column names, paths) are never sent to the client.
 * - The original error is preserved as `cause` so the server-side
 *   `onError` interceptor keeps the full diagnostic in the logs.
 */
const errorMapper = o.middleware(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		if (error instanceof ORPCError) throw error;

		const appError = mapError(error);

		if (appError.statusCode >= 500 && !(error instanceof AppError)) {
			// Keep the full original error in the server logs.
			console.error("[rpc] Unhandled error:", error);
		}

		throw new ORPCError(appError.code, {
			status: appError.statusCode,
			message: appError.message,
			cause: error,
		});
	}
});

export const publicProcedure = o.use(errorMapper);

const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	return next({
		context: {
			session: context.session,
		},
	});
});

/**
 * Blocks every procedure call for a BLOCKED account, even when the session
 * token is still technically valid. Session revocation on block is the first
 * line of defence; this is the second, and it is always checked server-side —
 * never only in a frontend route guard.
 */
const requireActiveUser = o.middleware(async ({ context, next }) => {
	const userId = context.session?.user?.id;
	if (!userId) {
		throw new ORPCError("UNAUTHORIZED");
	}

	const user = await db.user.findUnique({
		where: { id: userId },
		select: { status: true },
	});

	if (!user) {
		throw new ORPCError("UNAUTHORIZED");
	}

	if (user.status === "BLOCKED") {
		throw new ORPCError("FORBIDDEN", {
			message: BLOCKED_USER_MESSAGE,
		});
	}

	return next();
});

export const protectedProcedure = publicProcedure
	.use(requireAuth)
	.use(requireActiveUser);
