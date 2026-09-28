import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Shapes } from "lucide-react";
import { useMemo } from "react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip, type TooltipRow } from "@/components/charts/tooltip";
import { formatCurrency } from "@/utils/format-currency";
import type { BudgetEntry } from "../../-types/analytics.types";
import { AnalyticsEmpty } from "./analytics-empty";

/**
 * Comparing `planned` across categories is a ranked comparison, so the bar
 * length carries the message. Paid, pending and the API-supplied percentage
 * stay in the tooltip rather than becoming three more series, which at this
 * width would be unreadable. Backend order is preserved: it already sorts
 * heaviest first.
 */
export function BudgetCategoryChart({ entries }: { entries: BudgetEntry[] }) {
	// Categories with nothing planned would render as empty rows.
	const data = useMemo(
		() => entries.filter((entry) => entry.planned > 0),
		[entries],
	);

	// The tooltip receives the row we handed the chart, so reading it back as
	// the entry type is a narrowing, not a guess.
	const readEntry = (point: Record<string, unknown>) => point as BudgetEntry;

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Shapes className="h-4 w-4" />
					Por categoria
				</CardTitle>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<AnalyticsEmpty message="Sem dados por categoria." />
				) : (
					<BarChart
						data={data}
						xDataKey="label"
						orientation="horizontal"
						aspectRatio="1.5 / 1"
						margin={{ top: 8, right: 24, bottom: 8, left: 96 }}
					>
						<Grid horizontal={false} vertical />
						<Bar dataKey="planned" lineCap="round" />
						<BarYAxis />
						<ChartTooltip
							rows={(point): TooltipRow[] => {
								const entry = readEntry(point);
								return [
									{
										color: "var(--chart-line-primary)",
										label: "Planeado",
										value: formatCurrency(entry.planned),
									},
									{
										color: "var(--chart-line-primary)",
										label: "Pago",
										value: formatCurrency(entry.paid),
									},
									{
										color: "var(--chart-line-primary)",
										label: "Por pagar",
										value: formatCurrency(entry.pending),
									},
									{
										color: "var(--chart-line-primary)",
										label: "Progresso",
										value: `${entry.percentage}%`,
									},
									{
										color: "var(--chart-line-primary)",
										label: "Itens",
										value: entry.count,
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
