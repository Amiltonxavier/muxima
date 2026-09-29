import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Progress } from "@muxima/ui/components/progress";
import { TableCell, TableRow } from "@muxima/ui/components/table";
import { Eye, History, Pencil, Plus, Trash2 } from "lucide-react";
import { StatusDot } from "@/shared/components/status-dot";
import { formatCurrency } from "@/utils/format-currency";
import {
	getStatusColor,
	getStatusLabel,
	getStatusTone,
	INVENTORY_CATEGORY_LABELS,
	INVENTORY_UNIT_LABELS,
} from "@/utils/status-helpers";
import type { InventoryItem } from "../-types/inventory.types";

/*
 * Colunas esperadas no cabeçalho da tabela (nesta ordem):
 * Item | Quantidade | Progresso | Valor | Estado | Acções
 */

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
	const unitLabel = INVENTORY_UNIT_LABELS[item.unit] || item.unit;

	return (
		<TableRow>
			{/* Item: nome + categoria + unidade */}
			<TableCell>
				<div className="flex flex-col gap-1">
					<span className="font-medium">{item.name}</span>
					<div className="flex items-center gap-2">
						<Badge variant="secondary">
							{INVENTORY_CATEGORY_LABELS[item.category] || item.category}
						</Badge>
					</div>
				</div>
			</TableCell>

			{/* Quantidade: actual / planeado, com o que falta por baixo */}
			<TableCell>
				<div className="flex flex-col gap-0.5 tabular-nums">
					<span className="font-medium">
						{item.currentQuantity}
						<span className="font-normal text-muted-foreground">
							{" / "}
							{item.plannedQuantity} {unitLabel}
						</span>
					</span>
					<span className="text-muted-foreground text-xs">
						{cannotAddMore ? "Completo" : `Em falta: ${item.remainingQuantity}`}
					</span>
				</div>
			</TableCell>

			{/* Progresso: só barra + percentagem */}
			<TableCell>
				<div className="flex min-w-[110px] items-center gap-2">
					<Progress value={item.completionPercentage} className="h-2 flex-1" />
					<span className="w-9 text-right text-muted-foreground text-xs tabular-nums">
						{item.completionPercentage}%
					</span>
				</div>
			</TableCell>

			{/* Estado: coluna própria */}
			<TableCell>
				<StatusDot
					label={getStatusLabel(item.status, "inventory")}
					tone={getStatusTone(item.status)}
				/>
			</TableCell>

			{/* Valor */}
			<TableCell className="tabular-nums">
				{item.unitPrice !== null ? formatCurrency(item.totalValue) : "—"}
			</TableCell>

			{/* Acções */}
			<TableCell>
				<div className="flex justify-end gap-1">
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
