import { dateHelper } from "@/core/helpers/date-helper";
import { formatCurrency } from "@/shared/utils/format-currency";
import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Progress } from "@muxima/ui/components/progress";
import { Pencil } from "lucide-react";
import {
	ArrowDownCircle,
	ArrowUpCircle,
	RefreshCw,
} from "lucide-react";
import {
	INVENTORY_UNIT_LABELS,
	MOVEMENT_TYPE_LABELS,
} from "@/shared/utils/status-helpers";
import { InventoryCategoryBadge } from "./inventory-category-badge";

const MOVEMENT_ICONS: Record<string, React.ReactNode> = {
	PURCHASE: <ArrowUpCircle className="h-4 w-4 text-green-500" />,
	ADD: <ArrowUpCircle className="h-4 w-4 text-blue-500" />,
	CONSUMPTION: <ArrowDownCircle className="h-4 w-4 text-amber-500" />,
	ADJUSTMENT: <RefreshCw className="h-4 w-4 text-purple-500" />,
	LOSS: <ArrowDownCircle className="h-4 w-4 text-red-500" />,
	RETURN: <ArrowUpCircle className="h-4 w-4 text-emerald-500" />,
};

interface ViewDialogProps {
	item: Record<string, unknown>;
	onClose: VoidFunction;
}

export function ViewDialog({ item, onClose }: ViewDialogProps) {


	const planned = Number(item.plannedQuantity) || 0;
	const current = Number(item.currentQuantity) || 0;
	const percent = (item.stockPercentage as number) ?? 0;
	const unitPrice = Number(item.unitPrice) || 0;
	const movements = (item.movements as Record<string, unknown>[]) ?? [];

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{item.name as string}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<InventoryCategoryBadge category={item.category as string} />
					</div>

					<div className="grid grid-cols-2 gap-3 text-sm">
						<div className="border p-3">
							<p className="text-muted-foreground text-xs">Unidade</p>
							<p className="font-medium">
								{INVENTORY_UNIT_LABELS[item.unit as string] ||
									(item.unit as string)}
							</p>
						</div>
						<div className="border p-3">
							<p className="text-muted-foreground text-xs">
								Preço por unidade
							</p>
							<p className="font-medium">
								{unitPrice > 0
									? `${unitPrice.toLocaleString("pt-AO")} Kz`
									: "Não definido"}
							</p>
						</div>
						{!!item.weight && Number(item.weight) > 0 && (
							<div className="border p-3">
								<p className="text-muted-foreground text-xs">Peso</p>
								<p className="font-medium">
									{String(Number(item.weight))} kg
								</p>
							</div>
						)}
						{!!item.deliveryDate && (
							<div className="border p-3">
								<p className="text-muted-foreground text-xs">
									Data de entrega
								</p>
								<p className="font-medium">
									{dateHelper.formatMedium(item.deliveryDate as string)}
								</p>
							</div>
						)}
					</div>

					<div className="rounded border p-3">
						<div className="mb-1 flex items-center justify-between text-sm">
							<span className="text-muted-foreground">
								Planeado: {planned}{" "}
								{INVENTORY_UNIT_LABELS[item.unit as string] || ""}
							</span>
							<span>Atual: {current}</span>
						</div>
						<Progress value={percent} />
						<p className="mt-1 text-muted-foreground text-xs">
							{percent}% concluído
						</p>
					</div>

					{unitPrice > 0 && (
						<div className="bg-muted p-3 text-sm">
							<p className="text-muted-foreground">Valor total</p>
							<p className="font-semibold text-lg">
								{formatCurrency(current * unitPrice)}
							</p>
						</div>
					)}

					{!!item.notes && (
						<div>
							<p className="text-muted-foreground text-sm">Notas</p>
							<p className="text-sm">{item.notes as string}</p>
						</div>
					)}

					<div className="space-y-2">
						<p className="font-medium text-sm">
							Histórico de movimentos ({movements.length})
						</p>
						{movements.length === 0 ? (
							<p className="py-4 text-center text-muted-foreground text-xs">
								Nenhum movimento registado
							</p>
						) : (
							<div className="space-y-1">
								{movements.map((m) => (
									<div
										key={m.id as string}
										className="flex items-center justify-between border p-2.5 text-xs"
									>
										<div className="flex items-center gap-2">
											{MOVEMENT_ICONS[m.type as string]}
											<div>
												<Badge variant="outline">
													{String(
														MOVEMENT_TYPE_LABELS[m.type as string] ||
															m.type ||
															"",
													)}
												</Badge>
												{!!m.reason && (
													<span className="ml-2 text-muted-foreground">
														{m.reason as string}
													</span>
												)}
											</div>
										</div>
										<div className="text-right">
											<span className="font-medium tabular-nums">
												{m.type === "CONSUMPTION" || m.type === "LOSS"
													? "-"
													: "+"}
												{String(m.quantity)}
											</span>
											<p className="text-muted-foreground">
												{m.createdAt
													? dateHelper.formatMedium(m.createdAt as string)
													: ""}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
					<Button onClick={()=>{}}>
						<Pencil className="mr-2 h-4 w-4" />
						Editar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
