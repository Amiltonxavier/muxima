import { Pagination } from "@muxima/ui/components/pagination";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BackButton } from "@/shared/components/back-to";
import { SupplierCreateDialog } from "./-components/supplier-create-dialog";
import { SupplierDeleteDialog } from "./-components/supplier-delete-dialog";
import { SupplierDetailsDialog } from "./-components/supplier-details-dialog";
import { SupplierEditDialog } from "./-components/supplier-edit-dialog";
import { SupplierFilters } from "./-components/supplier-filters";
import { SupplierHeader } from "./-components/supplier-header";
import { SupplierInstallmentsLoaderDialog } from "./-components/supplier-installments-loader-dialog";
import { SupplierPaymentDialog } from "./-components/supplier-payment-dialog";
import { SupplierStats } from "./-components/supplier-stats";
import { SupplierStatusDialog } from "./-components/supplier-status-dialog";
import { SupplierTable } from "./-components/supplier-table";
import { useSuppliersFilters } from "./-hooks/use-suppliers-filters";
import {
	type SupplierListItem,
	useSupplierStats,
	useSuppliers,
} from "./-queries/suppliers-queries";

export const Route = createFileRoute("/_private/events/$eventId/suppliers/")({
	component: SuppliersPage,
});

/**
 * The money of a supplier (price, paid, pending, percentage, payment status,
 * next due date) is resolved by the API. The table and the dialogs below only
 * render it and send the user's edits back.
 */
function SuppliersPage() {
	const { eventId } = Route.useParams();

	const filters = useSuppliersFilters();

	const [showCreate, setShowCreate] = useState(false);
	const [viewing, setViewing] = useState<SupplierListItem | null>(null);
	const [editing, setEditing] = useState<SupplierListItem | null>(null);
	const [changingStatus, setChangingStatus] = useState<SupplierListItem | null>(
		null,
	);
	const [payingTo, setPayingTo] = useState<SupplierListItem | null>(null);
	const [installmentsFor, setInstallmentsFor] =
		useState<SupplierListItem | null>(null);
	const [deleting, setDeleting] = useState<SupplierListItem | null>(null);

	const suppliersQuery = useSuppliers(eventId, {
		page: filters.page,
		limit: filters.limit,
		search: filters.search || undefined,
		category: filters.category === "ALL" ? undefined : filters.category,
		paymentStatus:
			filters.paymentStatus === "ALL" ? undefined : filters.paymentStatus,
	});
	const statsQuery = useSupplierStats(eventId);

	const suppliers = suppliersQuery.data?.data ?? [];
	const meta = suppliersQuery.data?.meta;
	const stats = statsQuery.data;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<SupplierHeader
				total={stats?.total ?? 0}
				onAddSupplier={() => setShowCreate(true)}
			/>

			<SupplierStats stats={stats} />

			<SupplierFilters
				search={filters.search}
				category={filters.category}
				paymentStatus={filters.paymentStatus}
				onSearchChange={filters.setSearch}
				onCategoryChange={filters.setCategory}
				onPaymentStatusChange={filters.setPaymentStatus}
			/>

			<SupplierTable
				suppliers={suppliers}
				isLoading={suppliersQuery.isLoading}
				isError={suppliersQuery.isError}
				hasActiveFilters={filters.hasActiveFilters}
				onView={setViewing}
				onAddPayment={setPayingTo}
				onManageInstallments={setInstallmentsFor}
				onChangeStatus={setChangingStatus}
				onEdit={setEditing}
				onDelete={setDeleting}
			/>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={filters.setPage}
					onLimitChange={filters.setLimit}
					disabled={suppliersQuery.isLoading}
				/>
			)}

			<SupplierCreateDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				eventId={eventId}
			/>

			{viewing && (
				<SupplierDetailsDialog
					open
					onOpenChange={(open) => {
						if (!open) setViewing(null);
					}}
					supplierId={viewing.id}
				/>
			)}

			{editing && (
				<SupplierEditDialog
					open
					onOpenChange={(open) => {
						if (!open) setEditing(null);
					}}
					supplier={editing}
				/>
			)}

			<SupplierStatusDialog
				supplier={changingStatus}
				open={!!changingStatus}
				onOpenChange={(open) => {
					if (!open) setChangingStatus(null);
				}}
			/>

			{payingTo && (
				<SupplierPaymentDialog
					open
					onOpenChange={(open) => {
						if (!open) setPayingTo(null);
					}}
					supplierId={payingTo.id}
					remaining={payingTo.pending}
					agreed={payingTo.price ?? 0}
					status={payingTo.status}
				/>
			)}

			{installmentsFor && (
				<SupplierInstallmentsLoaderDialog
					open
					onOpenChange={(open) => {
						if (!open) setInstallmentsFor(null);
					}}
					supplierId={installmentsFor.id}
					status={installmentsFor.status}
				/>
			)}

			{deleting && (
				<SupplierDeleteDialog
					open
					onOpenChange={(open) => {
						if (!open) setDeleting(null);
					}}
					supplier={deleting}
				/>
			)}
		</div>
	);
}
