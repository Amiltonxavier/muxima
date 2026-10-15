import { PERMISSIONS } from "@muxima/permissions";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { QueryState } from "@/shared/components/states";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";
import {
	type ChecklistItem,
	type ChecklistStatusValue,
	useUpdateChecklistItem,
} from "../-queries/checklist-queries";
import { ChecklistItemRow } from "./checklist-item-row";

/**
 * Lista de itens. Detém a mutação de conclusão (toggle) e o gating de
 * permissões; editar e eliminar são delegados à página, que abre os diálogos.
 */
export function ChecklistList({
	eventId,
	items,
	isLoading,
	isError,
	onEdit,
	onDelete,
}: {
	eventId: string;
	items: ChecklistItem[];
	isLoading: boolean;
	isError: boolean;
	onEdit: (item: ChecklistItem) => void;
	onDelete: (item: ChecklistItem) => void;
}) {
	const canUpdate = useEventCan(eventId, PERMISSIONS.CHECKLIST_UPDATE);
	const canDelete = useEventCan(eventId, PERMISSIONS.CHECKLIST_DELETE);
	const { isEventLocked, lockMessage } = useEventLock();

	const updateItem = useUpdateChecklistItem();

	const handleToggle = (item: ChecklistItem) => {
		const nextStatus: ChecklistStatusValue =
			item.status === "COMPLETED" ? "PENDING" : "COMPLETED";
		updateItem.mutate({ id: item.id, eventId, status: nextStatus });
	};

	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: items.length === 0,
				hasData: items.length > 0,
			}}
		>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Itens</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					{items.map((item) => (
						<ChecklistItemRow
							key={item.id}
							item={item}
							canUpdate={canUpdate}
							canDelete={canDelete}
							isEventLocked={isEventLocked}
							lockMessage={lockMessage}
							isToggling={updateItem.isPending}
							onToggle={handleToggle}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</CardContent>
			</Card>
		</QueryState>
	);
}
