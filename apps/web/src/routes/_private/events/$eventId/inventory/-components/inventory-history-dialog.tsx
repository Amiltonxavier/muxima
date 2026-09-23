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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { ErrorState } from "@/shared/components/states/error-state";
import { LoadingState } from "@/shared/components/states/loading-state";
import { formatCurrency } from "@/utils/format-currency";
import { formatDateTime } from "@/utils/format-date";
import { getStatusColor, getStatusLabel } from "@/utils/status-helpers";
import { MOVEMENT_TYPE_LABELS } from "../-constants/inventory.constants";
import { useInventoryHistory } from "../-queries/inventory-queries";

/**
 * Append-only movement history. The summary (actual, remaining, totals) and
 * every movement value are calculated by the backend.
 */
export function InventoryHistoryDialog({
	open,
	onOpenChange,
	itemId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	itemId: string;
}) {
	const historyQuery = useInventoryHistory(itemId);
	const history = historyQuery.data;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Histórico de movimentos</DialogTitle>
					<DialogDescription>
						{history?.item.name ?? "Quantidades e custos registados"}
					</DialogDescription>
				</DialogHeader>

				{historyQuery.isLoading ? (
					<LoadingState />
				) : historyQuery.isError || !history ? (
					<ErrorState message="Não foi possível carregar o histórico." />
				) : (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<SummaryCell
								label="Planeado"
								value={history.item.plannedQuantity}
							/>
							<SummaryCell
								label="Actual"
								value={history.item.currentQuantity}
							/>
							<SummaryCell
								label="Em falta"
								value={history.item.remainingQuantity}
							/>
							<div className="rounded border p-3">
								<p className="text-muted-foreground text-xs">Estado</p>
								<Badge className={getStatusColor(history.item.status)}>
									{getStatusLabel(history.item.status, "inventory")}
								</Badge>
							</div>
						</div>

						<div className="grid grid-cols-3 gap-3 rounded border p-3 text-sm">
							<div>
								<p className="text-muted-foreground text-xs">Movimentos</p>
								<p className="font-medium">{history.totals.movementsCount}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Total entrada</p>
								<p className="font-medium">{history.totals.totalEntered}</p>
							</div>
							<div>
								<p className="text-muted-foreground text-xs">Custo total</p>
								<p className="font-medium">
									{formatCurrency(history.totals.totalCost)}
								</p>
							</div>
						</div>

						{history.movements.length === 0 ? (
							<p className="py-6 text-center text-muted-foreground text-sm">
								Ainda não existem movimentos registados.
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Data</TableHead>
										<TableHead>Operação</TableHead>
										<TableHead>Qtd.</TableHead>
										<TableHead>Preço</TableHead>
										<TableHead>Custo</TableHead>
										<TableHead>Por</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{history.movements.map((movement) => (
										<TableRow key={movement.id}>
											<TableCell className="text-sm">
												{formatDateTime(movement.createdAt)}
											</TableCell>
											<TableCell>
												<Badge variant="secondary">
													{MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}
												</Badge>
											</TableCell>
											<TableCell>{movement.quantity}</TableCell>
											<TableCell>
												{movement.unitPrice !== null
													? formatCurrency(movement.unitPrice)
													: "—"}
											</TableCell>
											<TableCell>
												{movement.totalCost !== null
													? formatCurrency(movement.totalCost)
													: "—"}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												{movement.creator?.name ?? "—"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
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

function SummaryCell({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded border p-3">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="font-semibold text-lg">{value}</p>
		</div>
	);
}
