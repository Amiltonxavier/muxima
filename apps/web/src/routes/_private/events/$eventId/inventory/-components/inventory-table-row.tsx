import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Progress } from "@muxima/ui/components/progress";
import { TableCell, TableRow } from "@muxima/ui/components/table";
import { Eye, History, Pencil, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/format-currency";
import {
	getStatusColor,
	getStatusLabel,
	INVENTORY_CATEGORY_LABELS,
	INVENTORY_UNIT_LABELS,
} from "@/utils/status-helpers";
import type { InventoryItem } from "../-types/inventory.types";

export function InventoryTableRow({
	item,
	onViewItem,
	onEditItem,
	onAddQuantity,
	onViewHistory,
	onDeleteItem,
}: {
	item: InventoryItem;
	onViewItem: (item: InventoryItem) => void;
	onEditItem: (item: InventoryItem) => void;
	onAddQuantity: (item: InventoryItem) => void;
	onViewHistory: (item: InventoryItem) => void;
	onDeleteItem: (item: InventoryItem) => void;
}) {
	// The backend flags items without remaining quantity as not addable — the
	// disabled button is only a UX affordance; the backend rejects excess
	// additions regardless.
	const cannotAddMore = item.remainingQuantity <= 0;

	return (
		<TableRow>
			<TableCell className="font-medium">{item.name}</TableCell>
			<TableCell>
				<Badge variant="secondary">
					{INVENTORY_CATEGORY_LABELS[item.category] || item.category}
				</Badge>
			</TableCell>
			<TableCell>{INVENTORY_UNIT_LABELS[item.unit] || item.unit}</TableCell>
			<TableCell>{item.plannedQuantity}</TableCell>
			<TableCell>{item.currentQuantity}</TableCell>
			<TableCell>{item.remainingQuantity}</TableCell>
			<TableCell>
				{item.unitPrice !== null ? formatCurrency(item.totalValue) : "—"}
			</TableCell>
			<TableCell>
				<div className="flex min-w-[130px] flex-col gap-1">
					<div className="flex items-center justify-between gap-2">
						<span className="text-muted-foreground text-xs">
							{item.completionPercentage}%
						</span>
						<Badge className={getStatusColor(item.status)}>
							{getStatusLabel(item.status, "inventory")}
						</Badge>
					</div>
					<Progress value={item.completionPercentage} className="h-2" />
				</div>
			</TableCell>
			<TableCell>
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						title="Ver detalhes"
						onClick={() => onViewItem(item)}
					>
						<Eye className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title="Editar"
						onClick={() => onEditItem(item)}
					>
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title={
							cannotAddMore
								? "Quantidade planeada concluída"
								: "Adicionar quantidade"
						}
						disabled={cannotAddMore}
						onClick={() => onAddQuantity(item)}
					>
						<Plus className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						title="Ver histórico"
						onClick={() => onViewHistory(item)}
					>
						<History className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-destructive"
						title="Eliminar"
						onClick={() => onDeleteItem(item)}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}
