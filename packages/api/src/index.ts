import { BLOCKED_USER_MESSAGE, UNVERIFIED_USER_MESSAGE } from "@muxima/auth";

import db from "@muxima/db";
import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";
import {
	ForbiddenError,
	RateLimitError,
	UnauthorizedError,
} from "./shared/errors/app-error";
import { AUTH_CODES, ERROR_CODES } from "./shared/errors/codes";
import { mapError } from "./shared/errors/map-error";

export const o = os.$context<Context>();

/** Public code for a BLOCKED account, shared with the Better Auth boundary. */
export const ACCOUNT_BLOCKED_CODE = ERROR_CODES.ACCOUNT_BLOCKED;

/**
 * Central error mapping for every oRPC procedure.
 *
 * oRPC serialises its own transport envelope
 * (`{ defined, code, status, message, data }`) but it is fed from the very
 * same `mapError` the REST handler uses, so both surfaces expose the same
 * `code`, `status` and PT-PT `message`. `details` travels in the oRPC `data`
 * field — that is the envelope's slot for structured information.
 */
const errorMapper = o.middleware(async ({ context, next }) => {
	try {
		return await next();
	} catch (error) {
		// Errors already shaped by oRPC (validation, NOT_FOUND, …) are kept.
		if (error instanceof ORPCError) throw error;

		// The server logs the original error through its own `onError`
		// interceptor, so nothing internal is lost — it is only replaced here by
		// the public, PT-PT version the client is allowed to see.
		const appError = mapError(error);

		// The RPC surface does not go through the REST error handler, so the
		// `Retry-After` header is set here, before oRPC serialises the 429.
		if (
			appError instanceof RateLimitError &&
			appError.retryAfterSeconds !== undefined &&
			!context.reply?.hasHeader("retry-after")
		) {
			context.reply?.header("Retry-After", String(appError.retryAfterSeconds));
		}

		throw new ORPCError(appError.code, {
			status: appError.statusCode,
			message: appError.message,
			data: appError.details,
			cause: error,
		});
	}
});

export const publicProcedure = o.use(errorMapper);

const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new UnauthorizedError();
	}
	return next({
		context: {
			session: context.session,
		},
	});
});

/**
 * Blocks every procedure call for a BLOCKED account or one whose e-mail is
 * still unconfirmed, even when the session token is still technically valid.
 * Session revocation/refusal on block is the first line of defence; this is
 * the second, and it is always checked server-side — never only in a frontend
 * route guard.
 */
const requireActiveUser = o.middleware(async ({ context, next }) => {
	const userId = context.session?.user?.id;
	if (!userId) {
		throw new UnauthorizedError();
	}

	const user = await db.user.findUnique({
		where: { id: userId },
		select: { status: true, emailVerified: true },
	});

	if (!user) {
		throw new UnauthorizedError();
	}

	if (user.status === "BLOCKED") {
		throw new ForbiddenError(BLOCKED_USER_MESSAGE, {
			code: ACCOUNT_BLOCKED_CODE,
		});
	}

	if (user.emailVerified === false) {
		throw new ForbiddenError(UNVERIFIED_USER_MESSAGE, {
			code: AUTH_CODES.EMAIL_NOT_VERIFIED,
		});
	}

	return next();
});

export const protectedProcedure = publicProcedure
	.use(requireAuth)
	.use(requireActiveUser);
