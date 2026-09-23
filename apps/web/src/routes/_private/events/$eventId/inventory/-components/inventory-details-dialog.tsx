import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Progress } from "@muxima/ui/components/progress";
import { ErrorState } from "@/shared/components/states/error-state";
import { LoadingState } from "@/shared/components/states/loading-state";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import {
	getStatusLabel,
	INVENTORY_CATEGORY_LABELS,
	INVENTORY_UNIT_LABELS,
} from "@/utils/status-helpers";
import { useInventoryItem } from "../-queries/inventory-queries";

/**
 * Read-only view of an inventory item. Every quantity, value and percentage
 * is provided pre-calculated by the backend.
 */
export function InventoryDetailsDialog({
	open,
	onOpenChange,
	itemId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	itemId: string;
}) {
	const itemQuery = useInventoryItem(itemId);
	const item = itemQuery.data;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{item?.name ?? "Detalhes do produto"}</DialogTitle>
					<DialogDescription>
						Informação do item de inventário
					</DialogDescription>
				</DialogHeader>

				{itemQuery.isLoading ? (
					<LoadingState />
				) : itemQuery.isError || !item ? (
					<ErrorState message="Não foi possível carregar os detalhes do item." />
				) : (
					<div className="space-y-4">
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary">
								{INVENTORY_CATEGORY_LABELS[item.category] || item.category}
							</Badge>
							<Badge variant="outline">
								{INVENTORY_UNIT_LABELS[item.unit] || item.unit}
							</Badge>
							<Badge
								className={
									item.status === "COMPLETED"
										? "bg-emerald-50 text-emerald-700"
										: item.status === "IN_PROGRESS"
											? "bg-blue-50 text-blue-700"
											: "bg-amber-50 text-amber-700"
								}
							>
								{getStatusLabel(item.status, "inventory")}
							</Badge>
						</div>

						<div className="rounded border p-3">
							<p className="mb-1 text-muted-foreground text-xs">Progresso</p>
							<div className="mb-1 flex justify-between text-sm">
								<span>{item.completionPercentage}% concluído</span>
								<span className="text-muted-foreground">
									{item.currentQuantity} / {item.plannedQuantity}
								</span>
							</div>
							<Progress value={item.completionPercentage} />
						</div>

						<div className="grid grid-cols-2 gap-3">
							<DetailCell
								label="Quantidade planeada"
								value={item.plannedQuantity}
							/>
							<DetailCell
								label="Quantidade para o salão"
								value={item.venueQuantity}
							/>
							<DetailCell
								label="Quantidade concluída"
								value={item.currentQuantity}
							/>
							<DetailCell
								label="Quantidade em falta"
								value={item.remainingQuantity}
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<DetailCell
								label="Preço unitário"
								value={
									item.unitPrice !== null ? formatCurrency(item.unitPrice) : "—"
								}
							/>
							<DetailCell
								label="Valor total"
								value={formatCurrency(item.totalValue)}
							/>
							<DetailCell
								label="Valor concluído"
								value={formatCurrency(item.completedValue)}
							/>
							<DetailCell
								label="Valor pendente"
								value={formatCurrency(item.pendingValue)}
							/>
						</div>

						{item.vendor && (
							<DetailCell label="Fornecedor" value={item.vendor.name} />
						)}

						{item.notes && (
							<DetailCell label="Observações" value={item.notes} />
						)}

						<div className="grid grid-cols-2 gap-3 text-muted-foreground text-xs">
							<p>Criado: {formatDate(item.createdAt)}</p>
							<p>Actualizado: {formatDate(item.updatedAt)}</p>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DetailCell({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded border p-3">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="font-medium text-sm">{value}</p>
		</div>
	);
}
