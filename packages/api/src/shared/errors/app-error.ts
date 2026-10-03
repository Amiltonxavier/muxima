/**
 * Official application error contract.
 *
 * Every error produced by the API — business rules, services, repositories,
 * Zod/Prisma/Fastify mappings — is normalised into an `AppError` (or one of
 * its subclasses) so REST and oRPC share one envelope:
 *
 * ```json
 * { "error": { "code": "EVENT_NOT_FOUND", "message": "Evento não encontrado" } }
 * ```
 *
 * Rules:
 * - `message` is always user-facing and in PT-PT.
 * - `code` is stable, technical and language-independent.
 * - `details` is optional and only carries structured, non-sensitive
 *   information for the frontend (e.g. validation issues).
 */
export interface AppErrorOptions {
	/** Domain-specific public code (e.g. `EVENT_NOT_FOUND`). Defaults to the class code. */
	code?: string;
	/** Structured, non-sensitive payload for the frontend (e.g. `{ issues: [...] }`). */
	details?: unknown;
}

export class AppError extends Error {
	public readonly statusCode: number;
	public readonly code: string;
	public readonly details?: unknown;

	constructor(
		message: string,
		statusCode: number,
		code: string,
		details?: unknown,
	) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
		this.details = details;
	}
}

export class BadRequestError extends AppError {
	constructor(message = "Pedido inválido.", options?: AppErrorOptions) {
		super(message, 400, options?.code ?? "BAD_REQUEST", options?.details);
	}
}

export class UnauthorizedError extends AppError {
	constructor(
		message = "É necessário iniciar sessão para continuar.",
		options?: AppErrorOptions,
	) {
		super(message, 401, options?.code ?? "UNAUTHORIZED", options?.details);
	}
}

export class ForbiddenError extends AppError {
	constructor(
		message = "Não tem permissão para realizar esta operação.",
		options?: AppErrorOptions,
	) {
		super(message, 403, options?.code ?? "FORBIDDEN", options?.details);
	}
}

export class NotFoundError extends AppError {
	constructor(message = "Recurso não encontrado.", options?: AppErrorOptions) {
		super(message, 404, options?.code ?? "NOT_FOUND", options?.details);
	}
}

export class ConflictError extends AppError {
	constructor(
		message = "Já existe um registo com estes dados.",
		options?: AppErrorOptions,
	) {
		super(message, 409, options?.code ?? "CONFLICT", options?.details);
	}
}

export class ValidationError extends AppError {
	constructor(
		message = "Os dados enviados são inválidos.",
		options?: AppErrorOptions,
	) {
		super(message, 422, options?.code ?? "VALIDATION_ERROR", options?.details);
	}
}

export class RateLimitError extends AppError {
	constructor(
		message = "Demasiadas tentativas. Tente novamente dentro de alguns instantes.",
		options?: AppErrorOptions,
	) {
		super(
			message,
			429,
			options?.code ?? "RATE_LIMIT_EXCEEDED",
			options?.details,
		);
	}
}

export class InternalError extends AppError {
	constructor(
		message = "Ocorreu um erro interno. Tente novamente mais tarde.",
		options?: AppErrorOptions,
	) {
		super(
			message,
			500,
			options?.code ?? "INTERNAL_SERVER_ERROR",
			options?.details,
		);
	}
}
