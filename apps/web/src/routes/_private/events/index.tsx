import { Pagination } from "@muxima/ui/components/pagination";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { QueryState } from "@/shared/components/states";
import { accessKeys } from "@/shared/hooks/use-can";
import { CreateEventDialog } from "./-components/create-event-dialog";
import { DeleteEventDialog } from "./-components/delete-event-dialog";
import { EventCard } from "./-components/event-card";
import { EventsFilters } from "./-components/events-filters";
import { EventsHeader } from "./-components/events-header";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "./-constants/events.constants";
import {
	useAcceptEventInvite,
	useDeclineEventInvite,
	useEvents,
} from "./-queries/event-queries";
import type {
	EventListItem,
	EventStatusFilter,
	EventTypeFilter,
} from "./-types/events.types";

export const Route = createFileRoute("/_private/events/")({
	component: EventsPage,
});

function EventsPage() {
	const [page, setPage] = useState(DEFAULT_PAGE);
	const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
	const [search, setSearch] = useState("");
	const [filterStatus, setFilterStatus] = useState<EventStatusFilter>("ALL");
	const [filterType, setFilterType] = useState<EventTypeFilter>("ALL");
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const acceptInvite = useAcceptEventInvite();
	const declineInvite = useDeclineEventInvite();

	// Any filter change invalidates the current page number.
	const resetPage = useCallback(() => setPage(DEFAULT_PAGE), []);

	const eventsQuery = useEvents({
		page,
		limit,
		search: search || undefined,
		status: filterStatus !== "ALL" ? filterStatus : undefined,
		type: filterType !== "ALL" ? filterType : undefined,
	});

	const events = eventsQuery.data?.data ?? [];
	const meta = eventsQuery.data?.meta;
	const isEmpty = events.length === 0 && !eventsQuery.isLoading;

	// Which invite is mid-flight, so only that card spins.
	const invitePendingId = acceptInvite.isPending
		? acceptInvite.variables?.id
		: declineInvite.isPending
			? declineInvite.variables?.id
			: undefined;

	const handleAcceptInvite = (event: EventListItem) => {
		const invitationId = event.invitation?.id;
		if (!invitationId) return;
		acceptInvite.mutate(
			{ id: invitationId },
			{
				// The event layout's `beforeLoad` reads `accessKeys.byEvent` with a
				// 30s staleTime; the cached `{ role: null }` from before acceptance
				// would bounce the member to /403. Invalidate it and only then
				// navigate, so the guard refetches and sees the new membership.
				onSuccess: async () => {
					await queryClient.invalidateQueries({ queryKey: accessKeys.all });
					await navigate({
						to: "/events/$eventId",
						params: { eventId: String(event.id) },
					});
				},
			},
		);
	};

	const handleDeclineInvite = (event: EventListItem) => {
		const invitationId = event.invitation?.id;
		if (!invitationId) return;
		declineInvite.mutate({ id: invitationId });
	};

	return (
		<div className="space-y-6">
			<EventsHeader onCreate={() => setShowCreateDialog(true)} />

			<EventsFilters
				search={search}
				status={filterStatus}
				type={filterType}
				onSearchChange={(value) => {
					setSearch(value);
					resetPage();
				}}
				onStatusChange={(value) => {
					setFilterStatus(value);
					resetPage();
				}}
				onTypeChange={(value) => {
					setFilterType(value);
					resetPage();
				}}
			/>

			<QueryState
				state={{
					isLoading: eventsQuery.isLoading,
					isError: eventsQuery.isError,
					isEmpty,
					hasData: events.length > 0,
				}}
			>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{events.map((event) => (
						<EventCard
							key={event.id}
							event={event}
							onDelete={setDeleteId}
							onAccept={handleAcceptInvite}
							onDecline={handleDeclineInvite}
							invitePendingId={invitePendingId}
						/>
					))}
				</div>
			</QueryState>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={setPage}
					onLimitChange={(value) => {
						setLimit(value);
						resetPage();
					}}
					disabled={eventsQuery.isLoading}
				/>
			)}

			{showCreateDialog && (
				<CreateEventDialog
					open={showCreateDialog}
					onOpenChange={setShowCreateDialog}
				/>
			)}

			<DeleteEventDialog
				eventId={deleteId}
				onOpenChange={(open) => {
					if (!open) setDeleteId(null);
				}}
			/>
		</div>
	);
}
