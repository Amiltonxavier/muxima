export interface PaginationInput {
	page?: number | string;
	limit?: number | string;
}

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface PaginatedResult<T> {
	data: T[];
	meta: PaginationMeta;
}

export function parsePagination(input: PaginationInput) {
	const page = Math.max(1, Math.floor(Number(input.page) || 1));
	const limit = Math.min(
		100,
		Math.max(1, Math.floor(Number(input.limit) || 20)),
	);
	const skip = (page - 1) * limit;
	return { page, limit, skip };
}

export function getPaginationMeta(
	total: number,
	page: number,
	limit: number,
): PaginationMeta {
	return {
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit),
	};
}
