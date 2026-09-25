import { ZodError } from "zod";
import {
	AppError,
	BadRequestError,
	ConflictError,
	InternalError,
	NotFoundError,
	ValidationError,
} from "./app-error";

/**
 * Friendly message for schema/database configuration drift (P2022).
 * Internal details (column names, SQL, paths) are only kept in server logs.
 */
const DATA_CONFIG_ERROR_MESSAGE =
	"Não foi possível carregar os dados devido a um problema de configuração. Tente novamente ou contacte o administrador.";

const NOT_FOUND_MESSAGE = "O registo solicitado não foi encontrado";
const CONFLICT_MESSAGE = "Já existe um registo com estes dados";
const INVALID_REFERENCE_MESSAGE = "Referência inválida a outro registo";

/**
 * Detect Prisma known-request errors by shape instead of `instanceof`:
 * the name/code pair is stable across Prisma runtimes (generated client,
 * bundled server build, test mocks) where `instanceof` can fail.
 */
export function isPrismaKnownRequestError(
	error: unknown,
): error is { code: string; message: string } {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof (error as { code: unknown }).code === "string" &&
		(error as { code: string }).code.startsWith("P") &&
		(error as { name?: unknown }).name === "PrismaClientKnownRequestError"
	);
}

/**
 * Maps any error thrown by the data layer / services to an `AppError`
 * with a safe, user-facing message. The original error must be logged
 * separately by the caller (it is never sent to the client).
 *
 * Centralised so REST (Fastify) and oRPC share the exact same mapping.
 */
export function mapError(error: unknown): AppError {
	if (error instanceof AppError) return error;

	if (error instanceof ZodError) {
		return new ValidationError("Dados inválidos", error.flatten());
	}

	// Fastify-level errors that already carry a safe 4xx status
	// (rate limiting, body parsing, etc.) keep their status/code.
	const fastifyStatus = (error as { statusCode?: unknown }).statusCode;
	if (
		typeof fastifyStatus === "number" &&
		fastifyStatus >= 400 &&
		fastifyStatus < 500
	) {
		const fastifyCode = (error as { code?: unknown }).code;
		return new AppError(
			error instanceof Error && error.message ? error.message : "Bad request",
			fastifyStatus,
			typeof fastifyCode === "string" ? fastifyCode : "BAD_REQUEST",
		);
	}

	if (isPrismaKnownRequestError(error)) {
		switch (error.code) {
			// Column referenced by the client does not exist in the database
			// (schema/migration drift) — never expose the column/table names.
			case "P2022":
				return new InternalError(DATA_CONFIG_ERROR_MESSAGE);
			// Record not found (e.g. update/delete of a removed row)
			case "P2025":
				return new NotFoundError(NOT_FOUND_MESSAGE);
			// Unique constraint violation
			case "P2002":
				return new ConflictError(CONFLICT_MESSAGE);
			// Foreign key constraint violation
			case "P2003":
				return new BadRequestError(INVALID_REFERENCE_MESSAGE);
			default:
				return new InternalError();
		}
	}

	return new InternalError();
}
