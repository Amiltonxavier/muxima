import { Button } from "@muxima/ui/components/button";
import { Progress } from "@muxima/ui/components/progress";
import { Eye, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { INVENTORY_UNIT_LABELS } from "@/shared/utils/status-helpers";
import { InventoryCategoryBadge } from "./inventory-category-badge";
import { MovementDialog } from "./movement-dialog";
import { ViewDialog } from "./view-dialog";
import { DeleteDialog } from "./delete-dialog";
import { ACTION_TYPES_EVENT } from "../-constants";
import { buildPayload } from "../-utils";
import { UpdateInventoryDialog } from "./update-inventory-dialog";
import { useSelected } from "@/core/hooks/useSelected";
import { SelectedItem } from "@/core/types";
import { ActionTypeEvent } from "../-types";

interface InventoryTableProps {
	items: Record<string, unknown>[];
}

export function InventoryTable({
	items,
}: InventoryTableProps) {
	const { clearSelection,
		isSelected,
		onSelect,
		selectedAction,
		selectedItem
	} = useSelected<SelectedItem, ActionTypeEvent>()

	return (
		<>

			<div className="border">
				<table className="w-full caption-bottom text-sm">
					<thead className="border-b bg-muted/50">
						<tr>
							<th className="h-10 px-4 text-left font-medium text-muted-foreground">
								Nome
							</th>
							<th className="h-10 px-4 text-left font-medium text-muted-foreground">
								Categoria
							</th>
							<th className="h-10 px-4 text-left font-medium text-muted-foreground">
								Unidade
							</th>
							<th className="h-10 px-4 text-right font-medium text-muted-foreground">
								Planeado
							</th>
							<th className="h-10 px-4 text-right font-medium text-muted-foreground">
								Atual
							</th>
							<th className="h-10 px-4 text-left font-medium text-muted-foreground">
								Progresso
							</th>
							<th className="h-10 px-4 text-right font-medium text-muted-foreground">
								Preço/unid.
							</th>
							<th className="h-10 px-4 text-right font-medium text-muted-foreground">
								Ações
							</th>
						</tr>
					</thead>
					<tbody>
						{items.map((item) => {
							const planned = Number(item.plannedQuantity) || 0;
							const current = Number(item.currentQuantity) || 0;
							const percent = (item.stockPercentage as number) ?? 0;
							const unitPrice = Number(item.unitPrice) || 0;

							return (
								<tr
									key={item.id as string}
									className="border-b transition-colors hover:bg-muted/50"
								>
									<td className="p-4">
										<div className="flex items-center gap-2">
											<span className="font-medium">
												{item.name as string}
											</span>
										</div>
									</td>
									<td className="p-4">
										<InventoryCategoryBadge category={item.category as string} />
									</td>
									<td className="p-4 text-muted-foreground">
										{String(
											INVENTORY_UNIT_LABELS[item.unit as string] ||
											item.unit ||
											"",
										)}
									</td>
									<td className="p-4 text-right tabular-nums">{planned}</td>
									<td className="p-4 text-right font-medium tabular-nums">
										{current}
									</td>
									<td className="p-4">
										<div className="flex items-center gap-2">
											<Progress value={percent} className="h-2 w-20" />
											<span className="tabular-nums text-muted-foreground text-xs">
												{percent}%
											</span>
										</div>
									</td>
									<td className="p-4 text-right tabular-nums">
										{unitPrice > 0
											? `${unitPrice.toLocaleString("pt-AO")} Kz`
											: "—"}
									</td>
									<td className="p-4 text-right">
										<div className="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => onSelect(item, ACTION_TYPES_EVENT.MOVIMENT)}
												title="Movimentar"
											>
												<RefreshCw className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => onSelect(item, ACTION_TYPES_EVENT.VIEW)}
												title="Ver detalhes"
											>
												<Eye className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => onSelect(item, ACTION_TYPES_EVENT.UPDATE)}
												title="Editar"
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												className="text-destructive"
												onClick={() => onSelect(item, ACTION_TYPES_EVENT.DELETE)}
												title="Eliminar"
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{isSelected && selectedAction === ACTION_TYPES_EVENT.UPDATE && selectedItem && (
				<UpdateInventoryDialog
					open={isSelected}
					onOpenChange={clearSelection}
					initialValues={buildPayload(selectedItem)}
				/>
			)}

			{isSelected && selectedAction === ACTION_TYPES_EVENT.MOVIMENT && selectedItem && (
				<MovementDialog
					open={isSelected}
					onOpenChange={clearSelection}
					item={selectedItem}
				/>
			)}

			{isSelected && selectedAction === ACTION_TYPES_EVENT.VIEW && selectedItem && (
				<ViewDialog
					item={selectedItem}
					onClose={clearSelection}
				/>
			)}

			{isSelected && selectedAction === ACTION_TYPES_EVENT.DELETE && selectedItem &&
				<DeleteDialog
					open={isSelected}
					onOpenChange={clearSelection}
					eventId={selectedItem.id as string}
				/>}
		</>

	);
}
