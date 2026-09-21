import type { PaginationMeta } from "../utils/helpers";

export function successResponse<T>(data: T) {
	return { data };
}

export function listResponse<T>(data: T[], meta: PaginationMeta) {
	return { data, meta };
}

export function errorResponse(code: string, message: string) {
	return { error: { code, message } };
}
