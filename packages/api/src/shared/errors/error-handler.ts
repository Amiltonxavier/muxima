import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./app-error";

export function errorHandler(
	error: FastifyError,
	_request: FastifyRequest,
	reply: FastifyReply,
) {
	if (error instanceof AppError) {
		return reply.status(error.statusCode).send({
			error: {
				code: error.code,
				message: error.message,
			},
		});
	}

	return reply.status(500).send({
		error: {
			code: "INTERNAL_ERROR",
			message: "Internal server error",
		},
	});
}
