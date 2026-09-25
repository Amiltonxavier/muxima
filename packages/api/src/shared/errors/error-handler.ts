import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./app-error";
import { mapError } from "./map-error";

/**
 * Global REST error handler.
 *
 * - Every error is mapped through `mapError` so Prisma/Zod/unexpected errors
 *   always produce the same `{ error: { code, message } }` shape with a
 *   safe, user-facing message.
 * - The original error (stack, column names, SQL, paths) is only written to
 *   the server log — never sent to the client.
 */
export function errorHandler(
	error: FastifyError,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const appError: AppError = mapError(error);

	if (appError.statusCode >= 500 && !(error instanceof AppError)) {
		// Unexpected error: keep the full original for diagnosis.
		request.log.error({ err: error }, "Unhandled API error");
	} else if (appError.statusCode >= 500) {
		request.log.warn(
			{ code: appError.code, originalMessage: error.message },
			"Request failed",
		);
	}

	return reply.status(appError.statusCode).send({
		error: {
			code: appError.code,
			message: appError.message,
		},
	});
}
