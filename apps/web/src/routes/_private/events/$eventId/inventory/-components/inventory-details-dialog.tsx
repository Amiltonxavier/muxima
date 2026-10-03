import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { useMemo } from "react";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { ChartLegend } from "@/shared/components/charts";
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

const QUANTITY_CHART_SIZE = 160;
const QUANTITY_CHART_INNER_RADIUS = 52;
const QUANTITY_CENTER_BOX = QUANTITY_CHART_INNER_RADIUS * 2 - 16;

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

	const { hasPrice, unitPriceLabel } =
		item?.unitPrice != null
			? {
					hasPrice: true,
					unitPriceLabel: formatCurrency(item.unitPrice),
				}
			: {
					hasPrice: false,
					unitPriceLabel: "",
				};

	const quantitySlices = useMemo(
		() => [
			{
				label: "Concluído",
				value: item?.currentQuantity ?? 0,
				color: "var(--chart-1)",
			},
			{
				label: "Em falta",
				value: item?.remainingQuantity ?? 0,
				color: "var(--chart-5)",
			},
		],
		[item?.currentQuantity, item?.remainingQuantity],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
				<DialogHeader className="border-b pb-4">
					<DialogTitle>{item?.name ?? "Detalhes do item"}</DialogTitle>

					{item && (
						<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
							<span>
								{INVENTORY_CATEGORY_LABELS[item.category] ?? item.category}
							</span>

							<span aria-hidden="true">·</span>

							<span>{INVENTORY_UNIT_LABELS[item.unit] ?? item.unit}</span>

							<span aria-hidden="true">·</span>

							<span className="font-medium text-foreground">
								{getStatusLabel(item.status, "inventory")}
							</span>
						</div>
					)}
				</DialogHeader>

				{itemQuery.isLoading ? (
					<LoadingState />
				) : itemQuery.isError || !item ? (
					<ErrorState message="Não foi possível carregar os detalhes do item." />
				) : (
					<div className="grid gap-6 py-2 md:grid-cols-[0.9fr_1.1fr]">
						{/* LEFT — QUANTITY / PROGRESS */}
						<section className="space-y-5 md:border-r md:pr-6">
							<div>
								<h3 className="font-medium text-sm">Execução</h3>
								<p className="mt-1 text-muted-foreground text-xs">
									Acompanhamento das quantidades planeadas.
								</p>
							</div>

							<div className="flex justify-center py-2">
								<div className="relative shrink-0">
									<PieChart
										data={quantitySlices}
										innerRadius={QUANTITY_CHART_INNER_RADIUS}
										size={QUANTITY_CHART_SIZE}
									>
										{quantitySlices.map((slice, index) => (
											<PieSlice key={slice.label} index={index} />
										))}
									</PieChart>

									<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
										<span
											className="font-semibold text-xl tabular-nums"
											style={{
												maxWidth: QUANTITY_CENTER_BOX,
											}}
										>
											{item.completionPercentage}%
										</span>

										<span
											className="text-[0.625rem] text-muted-foreground leading-tight"
											style={{
												maxWidth: QUANTITY_CENTER_BOX,
											}}
										>
											concluído
										</span>
									</div>
								</div>
							</div>

							<ChartLegend
								items={quantitySlices.map((slice) => ({
									label: slice.label,
									color: slice.color,
									value: slice.value,
								}))}
							/>

							<div className="border-y py-3">
								<InfoRow
									label="Planeado"
									value={`${item.plannedQuantity} ${
										INVENTORY_UNIT_LABELS[item.unit] ?? item.unit
									}`}
								/>

								<InfoRow
									label="Concluído"
									value={`${item.currentQuantity} ${
										INVENTORY_UNIT_LABELS[item.unit] ?? item.unit
									}`}
								/>

								<InfoRow
									label="Em falta"
									value={`${item.remainingQuantity} ${
										INVENTORY_UNIT_LABELS[item.unit] ?? item.unit
									}`}
								/>
							</div>

							{item.notes && (
								<div className="border-t pt-4">
									<p className="text-muted-foreground text-xs">Observações</p>
									<p className="mt-1 text-sm leading-relaxed">{item.notes}</p>
								</div>
							)}
						</section>

						{/* RIGHT — FINANCIAL / DETAILS */}
						<section className="space-y-5">
							<div>
								<h3 className="font-medium text-sm">Valores</h3>
								<p className="mt-1 text-muted-foreground text-xs">
									Resumo financeiro do item.
								</p>
							</div>

							<div className="space-y-4">
								<MoneyRow
									label="Preço unitário"
									value={
										item.unitPrice !== null
											? formatCurrency(item.unitPrice)
											: "—"
									}
								/>

								<MoneyRow
									label="Montante total"
									value={formatCurrency(item.totalValue)}
									formula={
										hasPrice
											? `${item.plannedQuantity} × ${unitPriceLabel}`
											: undefined
									}
								/>

								<MoneyRow
									label="Montante concluído"
									value={formatCurrency(item.completedValue)}
									formula={
										hasPrice
											? `${item.currentQuantity} × ${unitPriceLabel}`
											: undefined
									}
								/>

								<MoneyRow
									label="Montante pendente"
									value={formatCurrency(item.pendingValue)}
									formula={
										hasPrice
											? `${formatCurrency(item.totalValue)} − ${formatCurrency(item.completedValue)}`
											: undefined
									}
								/>
							</div>

							<div className="border-t pt-4">
								<h3 className="font-medium text-sm">Informação</h3>

								<div className="mt-3 space-y-2">
									<InfoRow
										label="Categoria"
										value={
											INVENTORY_CATEGORY_LABELS[item.category] ?? item.category
										}
									/>

									<InfoRow
										label="Unidade"
										value={INVENTORY_UNIT_LABELS[item.unit] ?? item.unit}
									/>

									<InfoRow
										label="Estado"
										value={getStatusLabel(item.status, "inventory")}
									/>
								</div>
							</div>

							<div className="border-t pt-4 text-muted-foreground text-xs">
								<div className="flex justify-between gap-4">
									<span>Criado em {formatDate(item.createdAt)}</span>

									<span>Actualizado em {formatDate(item.updatedAt)}</span>
								</div>
							</div>
						</section>
					</div>
				)}

				<DialogFooter className="border-t pt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="text-right font-medium text-sm">{value}</span>
		</div>
	);
}

function MoneyRow({
	label,
	value,
	formula,
}: {
	label: string;
	value: string;
	formula?: string;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<span className="pt-0.5 text-muted-foreground text-xs">{label}</span>

			<div className="text-right">
				<p className="font-medium text-sm tabular-nums">{value}</p>

				{formula && (
					<p className="mt-0.5 text-muted-foreground text-xs tabular-nums">
						{formula}
					</p>
				)}
			</div>
		</div>
	);
}
