export function successResponse<T>(data: T) {
	return { data };
}

export function listResponse<T>(
	data: T[],
	meta: { page: number; limit: number; total: number },
) {
	return { data, meta };
}

export function errorResponse(code: string, message: string) {
	return { error: { code, message } };
}
