import { useCallback, useState } from "react";
import { DEFAULT_LIMIT, DEFAULT_PAGE } from "../-constants/guest.constants";
import type { InvitationResponseFilter } from "../-types/invitation.types";

/**
 * Filters for the invitations tab of the guests module.
 * Migrated from the deactivated `invitations` page.
 */
export function useInvitationsFilters() {
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [limit, setLimit] = useState(DEFAULT_LIMIT);
	const [search, setSearch] = useState("");
	const [response, setResponse] = useState<InvitationResponseFilter>("ALL");

	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const handleResponseChange = useCallback(
		(value: InvitationResponseFilter) => {
			setResponse(value);
			setPage(DEFAULT_PAGE);
		},
		[],
	);

	const handleLimitChange = useCallback((value: number) => {
		setLimit(value);
		setPage(DEFAULT_PAGE);
	}, []);

	return {
		page,
		limit,
		search,
		response,
		setPage,
		setLimit: handleLimitChange,
		setSearch: handleSearchChange,
		setResponse: handleResponseChange,
	};
}
