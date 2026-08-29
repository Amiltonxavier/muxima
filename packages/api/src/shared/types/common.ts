export type PaginationQuery = {
	page?: string;
	limit?: string;
	search?: string;
};

export type EventContext = {
	eventId: string;
	userId: string;
	role: string;
};
