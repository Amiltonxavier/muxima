export function parsePagination(query: { page?: string; limit?: string }) {
	const page = Math.max(1, Number(query.page) || 1);
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
	const skip = (page - 1) * limit;
	return { page, limit, skip };
}

export function getPaginationMeta(total: number, page: number, limit: number) {
	return {
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit),
	};
}
