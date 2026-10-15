import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BackButton } from "@/shared/components/back-to";
import { ChecklistHeader } from "./-components/checklist-header";
import { ChecklistItemDialog } from "./-components/checklist-item-dialog";
import { ChecklistList } from "./-components/checklist-list";
import { ChecklistStats } from "./-components/checklist-stats";
import { ChecklistStatusFilter } from "./-components/checklist-status-filter";
import { ConfirmDeleteDialog } from "./-components/confirm-delete-dialog";
import {
	type ChecklistItem,
	useChecklist,
	useChecklistStats,
} from "./-queries/checklist-queries";
import type { ChecklistStatusFilterValue } from "./-types/checklist.types";

export const Route = createFileRoute("/_private/events/$eventId/checklist/")({
	component: ChecklistPage,
});

/**
 * O checklist é uma lista de controlo do evento. Itens ligados a um
 * fornecedor ou a um item de inventário são geridos pela API — o estado é
 * derivado no backend e o frontend só o apresenta. Itens manuais podem ser
 * concluídos aqui.
 *
 * Página fina: detém apenas o estado de UI (filtro e diálogos) e compõe os
 * componentes; as mutações vivem nos componentes que as disparam.
 */
function ChecklistPage() {
	const { eventId } = Route.useParams();

	const [statusFilter, setStatusFilter] =
		useState<ChecklistStatusFilterValue>(undefined);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
	const [deletingItem, setDeletingItem] = useState<ChecklistItem | null>(null);

	const itemsQuery = useChecklist(eventId, { status: statusFilter });
	const statsQuery = useChecklistStats(eventId);

	const items = itemsQuery.data ?? [];

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<ChecklistHeader
				eventId={eventId}
				onNewItem={() => {
					setEditingItem(null);
					setDialogOpen(true);
				}}
			/>

			<ChecklistStats
				stats={statsQuery.data}
				isLoading={statsQuery.isLoading}
			/>

			<ChecklistStatusFilter
				statusFilter={statusFilter}
				onStatusChange={setStatusFilter}
			/>

			<ChecklistList
				eventId={eventId}
				items={items}
				isLoading={itemsQuery.isLoading}
				isError={itemsQuery.isError}
				onEdit={(item) => {
					setEditingItem(item);
					setDialogOpen(true);
				}}
				onDelete={(item) => setDeletingItem(item)}
			/>

			<ChecklistItemDialog
				key={editingItem?.id ?? "new"}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				eventId={eventId}
				editingItem={editingItem}
			/>

			<ConfirmDeleteDialog
				open={deletingItem !== null}
				onOpenChange={(open) => {
					if (!open) setDeletingItem(null);
				}}
				eventId={eventId}
				item={deletingItem}
			/>
		</div>
	);
}
