import type { PaginationMeta } from "../utils/helpers";

export function successResponse<T>(data: T) {
	return { data };
}

export function listResponse<T>(data: T[], meta: PaginationMeta) {
	return { data, meta };
}

/**
 * Official error envelope: `{ error: { code, message, details? } }`.
 * `details` is only present when the error carries structured, non-sensitive
 * information for the frontend (e.g. validation issues).
 */
export function errorResponse(
	code: string,
	message: string,
	details?: unknown,
) {
	return details === undefined
		? { error: { code, message } }
		: { error: { code, message, details } };
}
