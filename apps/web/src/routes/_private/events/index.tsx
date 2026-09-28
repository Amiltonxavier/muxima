import { Pagination } from "@muxima/ui/components/pagination";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { QueryState } from "@/shared/components/states";
import { CreateEventDialog } from "./-components/create-event-dialog";
import { DeleteEventDialog } from "./-components/delete-event-dialog";
import { EventCard } from "./-components/event-card";
import { EventsEmptyState } from "./-components/events-empty-state";
import { EventsFilters } from "./-components/events-filters";
import { EventsHeader } from "./-components/events-header";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "./-constants/events.constants";
import { useEvents } from "./-queries/event-queries";
import type { EventStatusFilter, EventTypeFilter } from "./-types/events.types";

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
						<EventCard key={event.id} event={event} onDelete={setDeleteId} />
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

			{isEmpty && (
				<EventsEmptyState onCreate={() => setShowCreateDialog(true)} />
			)}

			<CreateEventDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
			/>

			<DeleteEventDialog
				eventId={deleteId}
				onOpenChange={(open) => {
					if (!open) setDeleteId(null);
				}}
			/>
		</div>
	);
}
