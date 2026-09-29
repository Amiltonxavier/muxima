import { Pagination } from "@muxima/ui/components/pagination";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@muxima/ui/components/tabs";
import { createFileRoute } from "@tanstack/react-router";
import { List, Mail, Radar } from "lucide-react";
import { useState } from "react";
import { BackButton } from "@/shared/components/back-to";
import { CompanionManagerDialog } from "./-components/companion-manager-dialog";
import { DeleteGuestDialog } from "./-components/delete-guest-dialog";
import { GuestAnalytics } from "./-components/guest-analytics";
import { GuestDialog } from "./-components/guest-dialog";
import { GuestsBulkToolbar } from "./-components/guests-bulk-toolbar";
import { GuestsCapacityAlert } from "./-components/guests-capacity-alert";
import { GuestsFilters } from "./-components/guests-filters";
import { GuestsHeader } from "./-components/guests-header";
import { GuestsStats } from "./-components/guests-stats";
import { GuestsTable } from "./-components/guests-table";
import { InvitationsTab } from "./-components/invitation/invitations-tab";
import { ViewInvitationDialog } from "./-components/invitation/view-invitation-dialog";
import { ShareInvitationDialog } from "./-components/share-invitation-dialog";
import { useGuestActions } from "./-hooks/use-guest-actions";
import { useGuestDialog } from "./-hooks/use-guest-dialog";
import { useGuestSelection } from "./-hooks/use-guest-selection";
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
	const [activeTab, setActiveTab] = useState("lista");

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
	const selection = useGuestSelection(guests);

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<GuestsHeader onAddGuest={guestDialog.openCreateDialog} />

			<Tabs
				value={activeTab}
				onValueChange={(value) => setActiveTab(value)}
				className="space-y-6"
			>
				<TabsList>
					<TabsTrigger value="lista">
						<List className="mr-2 h-4 w-4" />
						Lista
					</TabsTrigger>
					<TabsTrigger value="convites">
						<Mail className="mr-2 h-4 w-4" />
						Convites
					</TabsTrigger>
					<TabsTrigger value="analytics">
						<Radar className="mr-2 h-4 w-4" />
						Analytics
					</TabsTrigger>
				</TabsList>

				<TabsContent value="lista" className="space-y-6">
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

					<GuestsBulkToolbar
						eventId={eventId}
						selectedCount={selection.selectedCount}
						invitationIdsToPublish={selection.publishableInvitationIds}
						guestIdsWithoutInvitation={selection.guestsWithoutInvitation.map(
							(guest) => guest.id,
						)}
						onClearSelection={selection.clear}
					/>

					<GuestsTable
						guests={guests}
						isLoading={guestsQuery.isLoading}
						isError={guestsQuery.isError}
						selectedIds={selection.selectedIds}
						onToggleSelected={selection.toggleGuest}
						onToggleAll={selection.toggleAll}
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
				</TabsContent>

				<TabsContent value="convites" className="space-y-6">
					<InvitationsTab
						eventId={eventId}
						onViewInvitation={setViewingInvitationGuestId}
					/>
				</TabsContent>

				<TabsContent value="analytics">
					<GuestAnalytics
						stats={stats}
						isLoading={statsQuery.isLoading}
						isError={statsQuery.isError}
					/>
				</TabsContent>
			</Tabs>

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
