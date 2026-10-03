import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { errorResponse } from "../http/response";
import { AppError, NotFoundError } from "./app-error";
import { ERROR_CODES } from "./codes";
import { mapError } from "./map-error";

/** Builds the single official error envelope from a normalised `AppError`. */
export function errorEnvelope(appError: AppError) {
	return errorResponse(appError.code, appError.message, appError.details);
}

/**
 * Global REST error handler.
 *
 * - Every error is mapped through `mapError` so Prisma/Zod/unexpected errors
 *   always produce the same `{ error: { code, message } }` shape with a
 *   safe, user-facing PT-PT message.
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

	return reply.status(appError.statusCode).send(errorEnvelope(appError));
}

/**
 * Global 404 handler for unmatched routes.
 *
 * Fastify's default body (`{ message, error, statusCode }`) is not part of the
 * project contract, so every unmatched route inside the API domain answers with
 * the official envelope instead.
 */
export function notFoundHandler(_request: FastifyRequest, reply: FastifyReply) {
	const appError = new NotFoundError(
		"O recurso solicitado não existe ou foi removido.",
		{ code: ERROR_CODES.NOT_FOUND },
	);
	return reply.status(appError.statusCode).send(errorEnvelope(appError));
}
