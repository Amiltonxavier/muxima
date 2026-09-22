import { Pagination } from "@muxima/ui/components/pagination";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BackButton } from "@/shared/components/back-to";
import { CompanionManagerDialog } from "./-components/companion-manager-dialog";
import { DeleteGuestDialog } from "./-components/delete-guest-dialog";
import { GuestDialog } from "./-components/guest-dialog";
import { GuestsCapacityAlert } from "./-components/guests-capacity-alert";
import { GuestsFilters } from "./-components/guests-filters";
import { GuestsHeader } from "./-components/guests-header";
import { GuestsStats } from "./-components/guests-stats";
import { GuestsTable } from "./-components/guests-table";
import { ViewInvitationDialog } from "./-components/invitation/view-invitation-dialog";
import { ShareInvitationDialog } from "./-components/share-invitation-dialog";
import { useGuestActions } from "./-hooks/use-guest-actions";
import { useGuestDialog } from "./-hooks/use-guest-dialog";
import { useGuestsFilters } from "./-hooks/use-guests-filters";
import { useGuestStats, useGuests, useTables } from "./-queries/guest-queries";
import type { GuestItem } from "./-types/guest.types";
import { buildGuestInitialValues } from "./-utils/guest.utils";

export const Route = createFileRoute("/_private/events/$eventId/guests/")({
	component: GuestsPage,
});

function GuestsPage() {
	const { eventId } = Route.useParams();

	const filters = useGuestsFilters();
	const guestDialog = useGuestDialog();
	const guestActions = useGuestActions();

	const [deleteGuest, setDeleteGuest] = useState<GuestItem | null>(null);
	const [managingCompanionGuest, setManagingCompanionGuest] =
		useState<GuestItem | null>(null);
	const [viewingInvitationGuestId, setViewingInvitationGuestId] = useState<
		string | null
	>(null);
	const [sharingGuest, setSharingGuest] = useState<GuestItem | null>(null);

	const guestsQuery = useGuests(eventId, {
		page: filters.page,
		limit: filters.limit,
		search: filters.search || undefined,
		status: filters.status !== "ALL" ? filters.status : undefined,
		type: filters.type !== "ALL" ? filters.type : undefined,
	});
	const statsQuery = useGuestStats(eventId);
	const tablesQuery = useTables(eventId);

	const guests = guestsQuery.data?.data ?? [];
	const meta = guestsQuery.data?.meta;
	const tables = tablesQuery.data?.data ?? [];
	const stats = statsQuery.data;
	const editingGuest = guestDialog.editingGuest;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<GuestsHeader
				stats={stats}
				guestCount={guests.length}
				onAddGuest={guestDialog.openCreateDialog}
			/>

			<GuestsCapacityAlert stats={stats} />

			<GuestsStats stats={stats} />

			<GuestsFilters
				search={filters.search}
				status={filters.status}
				type={filters.type}
				onSearchChange={filters.setSearch}
				onStatusChange={filters.setStatus}
				onTypeChange={filters.setType}
			/>

			<GuestsTable
				guests={guests}
				isLoading={guestsQuery.isLoading}
				isError={guestsQuery.isError}
				onViewInvitation={setViewingInvitationGuestId}
				onShareInvitation={setSharingGuest}
				onEditGuest={guestDialog.openEditDialog}
				onDeleteGuest={setDeleteGuest}
				onManageCompanions={setManagingCompanionGuest}
			/>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={filters.setPage}
					onLimitChange={filters.setLimit}
					disabled={guestsQuery.isLoading}
				/>
			)}

			<GuestDialog
				open={guestDialog.showCreateDialog}
				onOpenChange={guestDialog.closeCreateDialog}
				tables={tables}
				onSubmit={(values) =>
					guestActions.createGuest(
						eventId,
						values,
						guestDialog.closeCreateDialog,
					)
				}
				isLoading={guestActions.isCreating}
			/>

			{editingGuest && (
				<GuestDialog
					open={!!editingGuest}
					onOpenChange={guestDialog.closeEditDialog}
					tables={tables}
					initialValues={buildGuestInitialValues(editingGuest)}
					onSubmit={(values) =>
						guestActions.updateGuest(
							editingGuest.id,
							values,
							guestDialog.closeEditDialog,
						)
					}
					isLoading={guestActions.isUpdating}
				/>
			)}

			{deleteGuest && (
				<DeleteGuestDialog
					open={!!deleteGuest}
					onOpenChange={() => setDeleteGuest(null)}
					onConfirm={() =>
						guestActions.deleteGuest(deleteGuest.id, () => setDeleteGuest(null))
					}
					isLoading={guestActions.isDeleting}
				/>
			)}

			{managingCompanionGuest && (
				<CompanionManagerDialog
					guest={managingCompanionGuest}
					onClose={() => setManagingCompanionGuest(null)}
				/>
			)}

			{viewingInvitationGuestId && (
				<ViewInvitationDialog
					guestId={viewingInvitationGuestId}
					eventId={eventId}
					onClose={() => setViewingInvitationGuestId(null)}
				/>
			)}

			{sharingGuest && (
				<ShareInvitationDialog
					guest={{ id: sharingGuest.id, name: sharingGuest.name }}
					eventId={eventId}
					onClose={() => setSharingGuest(null)}
				/>
			)}
		</div>
	);
}
