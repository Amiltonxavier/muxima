import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Boxes } from "lucide-react";
import { useMemo } from "react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip, type TooltipRow } from "@/components/charts/tooltip";
import { ChartLegend } from "@/shared/components/charts";
import { formatCurrency } from "@/utils/format-currency";
import { chartColorAt } from "../../-constants/analytics.constants";
import type { BudgetEntry } from "../../-types/analytics.types";
import { AnalyticsEmpty } from "./analytics-empty";

/**
 * There are only ever two origins, so the three money buckets fit side by side
 * without crowding: grouping them shows how much each origin has committed and
 * how much of that is still open, which the previous split-only donut could not.
 */
export function BudgetSourceChart({ entries }: { entries: BudgetEntry[] }) {
	const data = useMemo(
		() =>
			entries.map((entry) => ({
				label: entry.label,
				planned: entry.planned,
				paid: entry.paid,
				pending: entry.pending,
			})),
		[entries],
	);

	// The tooltip receives the row we handed the chart, so reading it back as the
	// entry type is a narrowing, not a guess.
	const readEntry = (point: Record<string, unknown>) => point as BudgetEntry;

	const series = [
		{ key: "planned", label: "Planeado", color: chartColorAt(0) },
		{ key: "paid", label: "Pago", color: chartColorAt(1) },
		{ key: "pending", label: "Por pagar", color: chartColorAt(2) },
	] as const;

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Boxes className="h-4 w-4" />
					Por origem
				</CardTitle>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<AnalyticsEmpty message="Sem dados por origem." />
				) : (
					<div className="space-y-4">
						<BarChart
							data={data}
							xDataKey="label"
							aspectRatio="1.8 / 1"
							margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
						>
							<Grid />
							{series.map((s) => (
								<Bar
									key={s.key}
									dataKey={s.key}
									fill={s.color}
									stroke={s.color}
									lineCap="round"
								/>
							))}
							<BarXAxis showAllLabels />
							<ChartTooltip
								rows={(point): TooltipRow[] => {
									const entry = readEntry(point);
									return series.map((s) => ({
										color: s.color,
										label: s.label,
										value: formatCurrency(entry[s.key]),
									}));
								}}
							/>
						</BarChart>

						<ChartLegend
							items={series.map((s) => ({ label: s.label, color: s.color }))}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
