import { Pagination } from "@muxima/ui/components/pagination";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BackButton } from "@/shared/components/back-to";
import { InventoryAddQuantityDialog } from "./-components/inventory-add-quantity-dialog";
import { InventoryCreateDialog } from "./-components/inventory-create-dialog";
import { InventoryDeleteDialog } from "./-components/inventory-delete-dialog";
import { InventoryDetailsDialog } from "./-components/inventory-details-dialog";
import { InventoryEditDialog } from "./-components/inventory-edit-dialog";
import { InventoryFilters } from "./-components/inventory-filters";
import { InventoryHeader } from "./-components/inventory-header";
import { InventoryHistoryDialog } from "./-components/inventory-history-dialog";
import { InventoryStats } from "./-components/inventory-stats";
import { InventoryTable } from "./-components/inventory-table";
import { useInventoryFilters } from "./-hooks/use-inventory-filters";
import {
	useInventoryItems,
	useInventoryStats,
} from "./-queries/inventory-queries";
import type { InventoryItem } from "./-types/inventory.types";

export const Route = createFileRoute("/_private/events/$eventId/inventory/")({
	component: InventoryPage,
});

function InventoryPage() {
	const { eventId } = Route.useParams();

	const filters = useInventoryFilters();

	const [showCreate, setShowCreate] = useState(false);
	const [viewing, setViewing] = useState<InventoryItem | null>(null);
	const [editing, setEditing] = useState<InventoryItem | null>(null);
	const [addingTo, setAddingTo] = useState<InventoryItem | null>(null);
	const [historyFor, setHistoryFor] = useState<InventoryItem | null>(null);
	const [deleting, setDeleting] = useState<InventoryItem | null>(null);

	const itemsQuery = useInventoryItems(eventId, {
		page: filters.page,
		limit: filters.limit,
		search: filters.search || undefined,
		status: filters.status !== "ALL" ? filters.status : undefined,
		category: filters.category !== "ALL" ? filters.category : undefined,
	});
	const statsQuery = useInventoryStats(eventId);

	const items = itemsQuery.data?.data ?? [];
	const meta = itemsQuery.data?.meta;
	const stats = statsQuery.data;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<InventoryHeader
				stats={stats}
				itemCount={meta?.total ?? 0}
				onAddItem={() => setShowCreate(true)}
			/>

			<InventoryStats stats={stats} />

			<InventoryFilters
				search={filters.search}
				status={filters.status}
				category={filters.category}
				onSearchChange={filters.setSearch}
				onStatusChange={filters.setStatus}
				onCategoryChange={filters.setCategory}
			/>

			<InventoryTable
				items={items}
				isLoading={itemsQuery.isLoading}
				isError={itemsQuery.isError}
				hasActiveFilters={filters.hasActiveFilters}
				onViewItem={setViewing}
				onEditItem={setEditing}
				onAddQuantity={setAddingTo}
				onViewHistory={setHistoryFor}
				onDeleteItem={setDeleting}
			/>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={filters.setPage}
					onLimitChange={filters.setLimit}
					disabled={itemsQuery.isLoading}
				/>
			)}

			<InventoryCreateDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				eventId={eventId}
			/>

			{viewing && (
				<InventoryDetailsDialog
					open={!!viewing}
					onOpenChange={(open) => {
						if (!open) setViewing(null);
					}}
					itemId={viewing.id}
				/>
			)}

			{editing && (
				<InventoryEditDialog
					open={!!editing}
					onOpenChange={(open) => {
						if (!open) setEditing(null);
					}}
					item={editing}
				/>
			)}

			{addingTo && (
				<InventoryAddQuantityDialog
					open={!!addingTo}
					onOpenChange={(open) => {
						if (!open) setAddingTo(null);
					}}
					item={addingTo}
				/>
			)}

			{historyFor && (
				<InventoryHistoryDialog
					open={!!historyFor}
					onOpenChange={(open) => {
						if (!open) setHistoryFor(null);
					}}
					itemId={historyFor.id}
				/>
			)}

			{deleting && (
				<InventoryDeleteDialog
					open={!!deleting}
					onOpenChange={(open) => {
						if (!open) setDeleting(null);
					}}
					item={deleting}
				/>
			)}
		</div>
	);
}
