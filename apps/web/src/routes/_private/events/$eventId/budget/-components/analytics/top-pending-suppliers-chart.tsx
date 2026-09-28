import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Store } from "lucide-react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip, type TooltipRow } from "@/components/charts/tooltip";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import type { PendingSupplier } from "../../-types/analytics.types";
import { AnalyticsEmpty } from "./analytics-empty";

/**
 * Ranked outstanding balance per supplier. The API already returns them biggest
 * first, so the order is kept. Names are long, hence a horizontal bar: the
 * axis caps labels at 70px, so the tooltip carries the full name and the rest.
 */
export function TopPendingSuppliersChart({
	suppliers,
}: {
	suppliers: PendingSupplier[];
}) {
	const data = suppliers.filter((supplier) => supplier.pending > 0);

	const readSupplier = (point: Record<string, unknown>) =>
		point as PendingSupplier;

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Store className="h-4 w-4" />
					Maior pendência por fornecedor
				</CardTitle>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<AnalyticsEmpty message="Nenhum fornecedor com valores por pagar." />
				) : (
					<BarChart
						data={data}
						xDataKey="name"
						orientation="horizontal"
						aspectRatio="2 / 1"
						margin={{ top: 8, right: 24, bottom: 8, left: 96 }}
					>
						<Grid horizontal={false} vertical />
						<Bar dataKey="pending" lineCap="round" />
						<BarYAxis />
						<ChartTooltip
							rows={(point): TooltipRow[] => {
								const supplier = readSupplier(point);
								return [
									{
										color: "var(--chart-line-primary)",
										label: supplier.name,
										value: supplier.category,
									},
									{
										color: "var(--chart-line-primary)",
										label: "Planeado",
										value: formatCurrency(supplier.planned),
									},
									{
										color: "var(--chart-line-primary)",
										label: "Por pagar",
										value: formatCurrency(supplier.pending),
									},
									{
										color: "var(--chart-line-primary)",
										label: "Próximo",
										value: supplier.nextDueDate
											? formatDate(supplier.nextDueDate)
											: "—",
									},
								];
							}}
						/>
					</BarChart>
				)}
			</CardContent>
		</Card>
	);
}
