import { useCallback, useState } from "react";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "../-constants/inventory.constants";
import type {
	InventoryCategoryFilter,
	InventoryStatusFilter,
} from "../-types/inventory.types";

export function useInventoryFilters() {
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [limit, setLimit] = useState(DEFAULT_LIMIT);

	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<InventoryStatusFilter>("ALL");
	const [category, setCategory] = useState<InventoryCategoryFilter>("ALL");

	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const handleStatusChange = useCallback((value: InventoryStatusFilter) => {
		setStatus(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const handleCategoryChange = useCallback((value: InventoryCategoryFilter) => {
		setCategory(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const handleLimitChange = useCallback((value: number) => {
		setLimit(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const hasActiveFilters =
		search !== "" || status !== "ALL" || category !== "ALL";

	return {
		page,
		limit,
		search,
		status,
		category,
		hasActiveFilters,
		setPage,
		setLimit: handleLimitChange,
		setSearch: handleSearchChange,
		setStatus: handleStatusChange,
		setCategory: handleCategoryChange,
	};
}
