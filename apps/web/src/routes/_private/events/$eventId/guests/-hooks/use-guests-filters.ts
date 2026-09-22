import { useCallback, useState } from "react";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "../-constants/guest.constants";
import type { GuestStatusFilter, GuestTypeFilter } from "../-types/guest.types";

export function useGuestsFilters() {
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [limit, setLimit] = useState(DEFAULT_LIMIT);

	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<GuestStatusFilter>("ALL");
	const [type, setType] = useState<GuestTypeFilter>("ALL");

	const resetPage = useCallback(() => {
		setPage(DEFAULT_PAGE);
	}, []);

	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const handleStatusChange = useCallback((value: GuestStatusFilter) => {
		setStatus(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const handleTypeChange = useCallback((value: GuestTypeFilter) => {
		setType(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const handleLimitChange = useCallback((value: number) => {
		setLimit(value);
		setPage(DEFAULT_PAGE);
	}, []);

	return {
		page,
		limit,
		search,
		status,
		type,
		resetPage,
		setPage,
		setLimit: handleLimitChange,
		setSearch: handleSearchChange,
		setStatus: handleStatusChange,
		setType: handleTypeChange,
	};
}
