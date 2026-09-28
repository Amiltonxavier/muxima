import { useCallback, useState } from "react";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "../-constants/suppliers.constants";
import type {
	SupplierCategoryFilter,
	SupplierPaymentStatusFilter,
} from "../-types/suppliers.types";

const ALL = "ALL" as const;

export function useSuppliersFilters() {
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [limit, setLimit] = useState(DEFAULT_LIMIT);

	const [search, setSearch] = useState("");
	const [category, setCategory] = useState<SupplierCategoryFilter>(ALL);
	const [paymentStatus, setPaymentStatus] =
		useState<SupplierPaymentStatusFilter>(ALL);

	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const handleCategoryChange = useCallback((value: SupplierCategoryFilter) => {
		setCategory(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const handlePaymentStatusChange = useCallback(
		(value: SupplierPaymentStatusFilter) => {
			setPaymentStatus(value);
			setPage(DEFAULT_PAGE);
		},
		[],
	);

	const handleLimitChange = useCallback((value: number) => {
		setLimit(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const hasActiveFilters =
		search !== "" || category !== ALL || paymentStatus !== ALL;

	return {
		page,
		limit,
		search,
		category,
		paymentStatus,
		hasActiveFilters,
		setPage,
		setLimit: handleLimitChange,
		setSearch: handleSearchChange,
		setCategory: handleCategoryChange,
		setPaymentStatus: handlePaymentStatusChange,
	};
}
