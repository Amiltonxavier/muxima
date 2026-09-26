import { useCallback, useMemo, useState } from "react";
import {
	useDedications,
	useDedicationViewers,
} from "@/shared/queries/dedication-queries";
import {
	DEFAULT_LIMIT,
	DEFAULT_PAGE,
} from "../-constants/dedication.constants";
import type {
	DedicationDialogState,
	DedicationStatusFilter,
	DedicationTypeFilter,
	DedicationVisibilityFilter,
	ViewerMember,
} from "../-types/dedication.types";

/**
 * Owns the page state: filters, pagination and which overlay is open. The
 * list query lives here too so the route component stays purely presentational.
 */
export function useDedicationsPage(eventId: string) {
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [limit, setLimit] = useState(DEFAULT_LIMIT);
	const [search, setSearch] = useState("");
	const [type, setType] = useState<DedicationTypeFilter>("ALL");
	const [status, setStatus] = useState<DedicationStatusFilter>("ALL");
	const [visibility, setVisibility] =
		useState<DedicationVisibilityFilter>("ALL");
	const [dialog, setDialog] = useState<DedicationDialogState>({ kind: "none" });

	// Any filter change invalidates the current page offset.
	const resetPage = useCallback(() => setPage(DEFAULT_PAGE), []);

	const handleSearchChange = useCallback(
		(value: string) => {
			setSearch(value);
			resetPage();
		},
		[resetPage],
	);
	const handleTypeChange = useCallback(
		(value: DedicationTypeFilter) => {
			setType(value);
			resetPage();
		},
		[resetPage],
	);
	const handleStatusChange = useCallback(
		(value: DedicationStatusFilter) => {
			setStatus(value);
			resetPage();
		},
		[resetPage],
	);
	const handleVisibilityChange = useCallback(
		(value: DedicationVisibilityFilter) => {
			setVisibility(value);
			resetPage();
		},
		[resetPage],
	);

	const handleLimitChange = useCallback((value: number) => {
		setLimit(value);
		setPage(DEFAULT_PAGE);
	}, []);

	const openDialog = useCallback((next: DedicationDialogState) => {
		setDialog(next);
	}, []);
	const closeDialog = useCallback(() => setDialog({ kind: "none" }), []);

	const listQuery = useDedications(eventId, {
		page,
		limit,
		search: search || undefined,
		type: type !== "ALL" ? type : undefined,
		status: status !== "ALL" ? status : undefined,
		visibility,
	});

	// Grants are only needed while the sharing dialog is open.
	const viewersQuery = useDedicationViewers(
		eventId,
		dialog.kind === "visibility" ? dialog.id : null,
	);

	const dedications = useMemo(
		() => listQuery.data?.data ?? [],
		[listQuery.data],
	);
	const meta = listQuery.data?.meta;

	const currentViewers = useMemo<ViewerMember[]>(() => {
		const viewers = viewersQuery.data?.viewers ?? [];
		return viewers.map((viewer) => ({
			id: viewer.eventMemberId,
			userId: viewer.member.userId,
			name: viewer.member.user.name ?? viewer.member.user.email,
			email: viewer.member.user.email,
			isActive: viewer.member.status === "ACTIVE",
			lastOpenedAt: viewer.lastOpenedAt ? String(viewer.lastOpenedAt) : null,
		}));
	}, [viewersQuery.data]);

	/**
	 * The backend resolves who may receive access, so the picker trusts its
	 * `eligibleMembers` list instead of filtering members in the browser.
	 */
	const selectableMembers = useMemo<ViewerMember[]>(() => {
		const members = viewersQuery.data?.eligibleMembers ?? [];
		return members.map((member) => ({
			id: member.id,
			userId: member.userId,
			name: member.user.name ?? member.user.email,
			email: member.user.email,
			isActive: member.status === "ACTIVE",
		}));
	}, [viewersQuery.data]);

	const activeItem = useMemo(
		() =>
			dialog.kind === "none" || dialog.kind === "create"
				? undefined
				: dedications.find((item) => item.id === dialog.id),
		[dedications, dialog],
	);

	const hasFilters =
		search !== "" || type !== "ALL" || status !== "ALL" || visibility !== "ALL";

	return {
		// filters + pagination
		search,
		type,
		status,
		visibility,
		page,
		limit,
		hasFilters,
		handleSearchChange,
		handleTypeChange,
		handleStatusChange,
		handleVisibilityChange,
		handlePageChange: setPage,
		handleLimitChange,
		// data
		dedications,
		meta,
		listQuery,
		// overlays
		dialog,
		activeItem,
		currentViewers,
		selectableMembers,
		isViewersLoading: viewersQuery.isLoading,
		openDialog,
		closeDialog,
	};
}
