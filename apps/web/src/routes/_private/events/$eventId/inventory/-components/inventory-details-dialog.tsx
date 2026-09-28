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

/** Kept next to the chart so the overlay and the hole can never drift apart. */
const QUANTITY_CHART_SIZE = 140;
const QUANTITY_CHART_INNER_RADIUS = 46;
/** Usable width inside the hole, leaving a gap before the ring. */
const QUANTITY_CENTER_BOX = QUANTITY_CHART_INNER_RADIUS * 2 - 16;

/**
 * Read-only view of an inventory item. Every quantity, value and percentage
 * is provided pre-calculated by the backend. The pie carries the whole quantity
 * story — concluded vs. missing, which together add up to the planned total —
 * and the money figures live in a compact list instead of a grid of cards.
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

	// Without a unit price the API treats it as 0, so every derived figure is 0
	// and a formula would just be noise.
	const { hasPrice, unitPriceLabel } =
		item?.unitPrice != null
			? { hasPrice: true, unitPriceLabel: formatCurrency(item.unitPrice) }
			: { hasPrice: false, unitPriceLabel: "" };

	const quantitySlices = useMemo(
		() => [
			{
				label: "Concluído",
				value: item?.currentQuantity ?? 0,
				// Light and deep blue, far apart in lightness so the two halves of
				// the ring read as different quantities at a glance.
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

						{/* Quantities: the donut replaces the progress bar and the
						    quantity cells — same numbers, one visual. */}
						<div className="flex flex-col items-center gap-4 border p-4 sm:flex-row sm:justify-around">
							{/*
							 * The percentage sits in the hole, over the chart. `PieCenter`
							 * can only show the slice total there, and its custom renderer
							 * runs on hover only — so the headline the API returns,
							 * `completionPercentage`, is overlaid instead.
							 */}
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
										className="font-semibold text-lg tabular-nums"
										style={{ maxWidth: QUANTITY_CENTER_BOX }}
									>
										{item.completionPercentage}%
									</span>
									<span
										className="text-[0.625rem] text-muted-foreground leading-tight"
										style={{ maxWidth: QUANTITY_CENTER_BOX }}
									>
										concluído
									</span>
								</div>
							</div>
							<div className="space-y-3">
								<ChartLegend
									items={quantitySlices.map((slice) => ({
										label: slice.label,
										color: slice.color,
										value: slice.value,
									}))}
								/>
								<p className="text-muted-foreground text-xs">
									Planeado: {item.plannedQuantity}{" "}
									{INVENTORY_UNIT_LABELS[item.unit] || item.unit}
								</p>
							</div>
						</div>

						{/* Money as a compact list, no cards. Each derived figure carries
					    the operands the API used, so the number can be checked
					    without repeating any of the arithmetic here. */}
						<div className="space-y-1.5">
							<MoneyRow
								label="Preço unitário"
								value={
									item.unitPrice !== null ? formatCurrency(item.unitPrice) : "—"
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

						{item.notes && (
							<div className="rounded-md bg-muted/50 p-3">
								<p className="text-muted-foreground text-xs">Observações</p>
								<p className="mt-1 text-sm">{item.notes}</p>
							</div>
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
		<div className="flex items-baseline justify-between gap-3">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="text-right">
				<span className="block font-medium text-sm">{value}</span>
				{formula && (
					<span className="block text-muted-foreground text-xs tabular-nums">
						{formula}
					</span>
				)}
			</span>
		</div>
	);
}
