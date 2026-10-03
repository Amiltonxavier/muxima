import { ERROR_CODES, type ErrorCode } from "./codes";

/** A single field-level validation problem reported by the API. */
export interface ApiValidationIssue {
	/** Dot-joined field path, e.g. `email` or `company.address`. `*` = form level. */
	path: string;
	message: string;
}

export interface ApiErrorDetails {
	issues?: ApiValidationIssue[];
	[key: string]: unknown;
}

/**
 * Normalised shape every error handler in the app works with, whatever the
 * transport was (oRPC, REST, Better Auth or a thrown client-side error).
 */
export interface ApiErrorInfo {
	/** Stable, technical, language-independent identifier. */
	code: ErrorCode;
	/** User-facing message, always PT-PT as produced by the API. */
	message: string;
	/** HTTP status when the error came from a request. */
	status?: number;
	/** Structured, non-sensitive payload (validation issues, …). */
	details?: ApiErrorDetails;
}

/** Message shown when nothing usable came from the server. */
export const GENERIC_ERROR_MESSAGE =
	"Ocorreu um erro inesperado. Tente novamente.";

/** Message used when the session is no longer valid. */
export const SESSION_EXPIRED_MESSAGE =
	"A sua sessão expirou. Inicie sessão novamente.";

const GENERIC_MESSAGE_BY_STATUS: Record<number, string> = {
	400: "Não foi possível processar o pedido. Verifique os dados enviados.",
	401: "É necessário iniciar sessão para continuar.",
	403: "Não tem permissão para realizar esta operação.",
	404: "O recurso solicitado não existe ou foi removido.",
	409: "Já existe um registo com estes dados.",
	422: "Os dados enviados são inválidos.",
	429: "Demasiadas tentativas. Tente novamente dentro de alguns instantes.",
};

const CODE_BY_STATUS: Record<number, ErrorCode> = {
	400: ERROR_CODES.BAD_REQUEST,
	401: ERROR_CODES.UNAUTHORIZED,
	403: ERROR_CODES.FORBIDDEN,
	404: ERROR_CODES.NOT_FOUND,
	409: ERROR_CODES.CONFLICT,
	422: ERROR_CODES.VALIDATION_ERROR,
	429: ERROR_CODES.RATE_LIMIT_EXCEEDED,
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readString(source: Record<string, unknown>, key: string) {
	const value = source[key];
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStatus(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	// Better Auth serialises the status as a string inside the body.
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

function readDetails(value: unknown): ApiErrorDetails | undefined {
	if (!isRecord(value)) return undefined;
	return value as ApiErrorDetails;
}

/**
 * Extracts the official envelope from an already-parsed payload, accepting both
 * shapes the API uses: `{ error: { code, message, details } }` (REST and Better
 * Auth) and the flat `{ code, status, message, data }` (oRPC).
 */
function fromPayload(payload: unknown): {
	code?: string;
	message?: string;
	status?: number;
	details?: ApiErrorDetails;
} {
	if (!isRecord(payload)) return {};

	const envelope = isRecord(payload.error) ? payload.error : payload;

	const details =
		readDetails(envelope.details) ?? readDetails(payload.data) ?? undefined;

	return {
		code: readString(envelope, "code") ?? readString(payload, "code"),
		message: readString(envelope, "message") ?? readString(payload, "message"),
		status:
			readStatus(envelope.status) ??
			readStatus(payload.status) ??
			readStatus(envelope.statusCode) ??
			readStatus(payload.statusCode),
		details,
	};
}

/**
 * Converts any thrown value into the normalised `ApiErrorInfo`.
 *
 * It understands, in order:
 * - `ORPCError` from the oRPC client (`{ code, status, message, data }`);
 * - Better Auth's `APIError`, whose `body` is the server envelope;
 * - a `Response`/plain object carrying the REST envelope;
 * - a `ZodError` raised by client-side schemas (so a form can show its issues);
 * - anything else → generic PT-PT message, never the raw thrown text.
 */
export function parseApiError(error: unknown): ApiErrorInfo {
	const isObject = isRecord(error);
	// oRPC errors carry the public code directly and `details` in `data`. This
	// also covers errors re-thrown with a `code` attached (see `toApiError`).
	const code = isObject ? readString(error, "code") : undefined;

	if (isObject && code) {
		return finalize({ ...fromPayload(error), code });
	}

	if (isObject && !(error instanceof Error)) {
		// Better Auth APIError (and anything shaped like the REST envelope).
		// The status alone is enough to pick a code and a PT-PT default.
		const payload = fromPayload(error.body ?? error);
		// Better Auth puts the HTTP status on the error itself, not in the body.
		const status = payload.status ?? readStatus(error.status);
		if (payload.code || payload.message || status !== undefined) {
			return finalize({ ...payload, status });
		}
	}

	// Client-side ZodError: surface its issues so forms can map them to fields.
	if (
		isRecord(error) &&
		Array.isArray((error as { issues?: unknown }).issues)
	) {
		const issues = (error as { issues: Array<Record<string, unknown>> }).issues
			.map((issue) => ({
				path:
					Array.isArray(issue.path) && issue.path.length > 0
						? issue.path.join(".")
						: "*",
				message:
					typeof issue.message === "string" && issue.message.trim()
						? issue.message
						: "Valor inválido.",
			}))
			.filter((issue) => issue.message.trim().length > 0);

		return {
			code: ERROR_CODES.VALIDATION_ERROR,
			message: "Os dados enviados são inválidos.",
			status: 422,
			details: { issues },
		};
	}

	// Anything else (an `Error` from a library, an assertion, a rejected fetch)
	// keeps its text to itself: only the envelope shapes above are trusted, so no
	// stack trace or internal wording can ever reach the UI.
	return finalize({});
}

/**
 * Fills in whatever the transport did not provide. A message coming from the
 * server is trusted as-is (the API already guarantees PT-PT); anything missing
 * is replaced by a status-aware PT-PT default.
 */
function finalize(partial: {
	code?: string;
	message?: string;
	status?: number;
	details?: ApiErrorDetails;
}): ApiErrorInfo {
	const status = partial.status;
	const code =
		partial.code ??
		(status !== undefined ? CODE_BY_STATUS[status] : undefined) ??
		ERROR_CODES.INTERNAL_SERVER_ERROR;

	const message =
		partial.message?.trim() ||
		(status !== undefined ? GENERIC_MESSAGE_BY_STATUS[status] : undefined) ||
		GENERIC_ERROR_MESSAGE;

	return {
		code,
		message,
		...(status !== undefined ? { status } : {}),
		...(partial.details ? { details: partial.details } : {}),
	};
}

/** Convenience helper: the `details.issues` array, when present. */
export function apiValidationIssues(error: unknown): ApiValidationIssue[] {
	const details = parseApiError(error).details;
	return Array.isArray(details?.issues) ? details.issues : [];
}

/** `true` when the API reported a validation failure. */
export function isValidationError(error: unknown): boolean {
	return parseApiError(error).code === ERROR_CODES.VALIDATION_ERROR;
}
