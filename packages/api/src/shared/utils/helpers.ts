export function parsePagination(query: { page?: number | string; limit?: number | string }) {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
	const skip = (page - 1) * limit;
	return { page, limit, skip };
}

export function getPaginationMeta(total: number, page: number, limit: number) {
	return {
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit),
		hasNextPage: page * limit < total,
		hasPreviousPage: page > 1,
	};
}

export type PaginatedResult<T> = {
	data: T[];
	pagination: ReturnType<typeof getPaginationMeta>;
};

export function paginatedResponse<T>(
	data: T[],
	total: number,
	page: number,
	limit: number,
): PaginatedResult<T> {
	return {
		data,
		pagination: getPaginationMeta(total, page, limit),
	};
}
