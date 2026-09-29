import { useCallback, useState } from "react";
import type {
	MemberRoleFilter,
	MemberStatusFilter,
} from "../-types/member.types";

/** Filter + pagination state for the members table. */
export function useMembersFilters() {
	const [search, setSearchRaw] = useState("");
	const [role, setRoleRaw] = useState<MemberRoleFilter>("ALL");
	const [status, setStatusRaw] = useState<MemberStatusFilter>("ALL");
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	// Any filter change must return to page 1, otherwise the user can land on a
	// page that no longer exists for the new filter.
	const setSearch = useCallback((value: string) => {
		setSearchRaw(value);
		setPage(1);
	}, []);

	const setRole = useCallback((value: MemberRoleFilter) => {
		setRoleRaw(value);
		setPage(1);
	}, []);

	const setStatus = useCallback((value: MemberStatusFilter) => {
		setStatusRaw(value);
		setPage(1);
	}, []);

	const setLimitAndResetPage = useCallback((value: number) => {
		setLimit(value);
		setPage(1);
	}, []);

	const reset = useCallback(() => {
		setSearchRaw("");
		setRoleRaw("ALL");
		setStatusRaw("ALL");
		setPage(1);
	}, []);

	return {
		search,
		role,
		status,
		page,
		limit,
		setSearch,
		setRole,
		setStatus,
		setPage,
		setLimit: setLimitAndResetPage,
		reset,
		hasActiveFilters: search !== "" || role !== "ALL" || status !== "ALL",
	};
}
