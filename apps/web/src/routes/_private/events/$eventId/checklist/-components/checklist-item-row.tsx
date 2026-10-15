import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Checkbox } from "@muxima/ui/components/checkbox";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import { dateHelper } from "@/shared/utils/date-helper";
import { getStatusColor, getStatusLabel } from "@/utils/status-helpers";
import type { ChecklistItem } from "../-queries/checklist-queries";

/**
 * Uma linha do checklist. Puramente apresentacional: o toggle e as ações de
 * editar/eliminar são delegados ao `ChecklistList`, que detém a mutação de
 * estado e o gating de permissões.
 */
export function ChecklistItemRow({
	item,
	canUpdate,
	canDelete,
	isEventLocked,
	lockMessage,
	isToggling,
	onToggle,
	onEdit,
	onDelete,
}: {
	item: ChecklistItem;
	canUpdate: boolean;
	canDelete: boolean;
	isEventLocked: boolean;
	lockMessage: string | null;
	isToggling: boolean;
	onToggle: (item: ChecklistItem) => void;
	onEdit: (item: ChecklistItem) => void;
	onDelete: (item: ChecklistItem) => void;
}) {
	const isCompleted = item.status === "COMPLETED";
	const isCancelled = item.status === "CANCELLED";
	const canToggle = !item.autoManaged && !isCancelled && canUpdate;
	const isOverdue =
		item.dueDate !== null &&
		!isCompleted &&
		!isCancelled &&
		dateHelper.isPast(item.dueDate);

	return (
		<div className="flex items-start gap-3 rounded-md border p-3">
			<Checkbox
				checked={isCompleted}
				disabled={!canToggle || isToggling}
				onCheckedChange={() => onToggle(item)}
				className="mt-0.5"
				aria-label={`Marcar "${item.title}" como ${isCompleted ? "pendente" : "concluído"}`}
			/>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<span
						className={`font-medium text-sm ${isCompleted || isCancelled ? "text-muted-foreground line-through" : ""}`}
					>
						{item.title}
					</span>
					<Badge variant="outline" className={getStatusColor(item.status)}>
						{getStatusLabel(item.status, "checklist")}
					</Badge>
					{item.autoManaged && <Badge variant="secondary">Automático</Badge>}
					{isOverdue && (
						<Badge className="bg-red-50 text-red-700">Em atraso</Badge>
					)}
				</div>
				{item.description && (
					<p className="text-muted-foreground text-sm">{item.description}</p>
				)}
				<div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
					{item.dueDate && (
						<span className="inline-flex items-center gap-1">
							<CalendarDays className="h-3 w-3" />
							{dateHelper.formatMedium(item.dueDate)}
						</span>
					)}
					{item.supplier && <span>Fornecedor: {item.supplier.name}</span>}
					{item.inventoryItem && (
						<span>Inventário: {item.inventoryItem.name}</span>
					)}
				</div>
			</div>
			<div className="flex items-center gap-1">
				{canUpdate && (
					<Button
						variant="ghost"
						size="icon"
						disabled={isEventLocked}
						title={isEventLocked ? (lockMessage ?? undefined) : undefined}
						onClick={() => onEdit(item)}
						aria-label="Editar item"
					>
						<Pencil className="h-4 w-4" />
					</Button>
				)}
				{canDelete && (
					<Button
						variant="ghost"
						size="icon"
						disabled={isEventLocked}
						title={isEventLocked ? (lockMessage ?? undefined) : undefined}
						onClick={() => onDelete(item)}
						aria-label="Eliminar item"
					>
						<Trash2 className="h-4 w-4 text-destructive" />
					</Button>
				)}
			</div>
		</div>
	);
}
