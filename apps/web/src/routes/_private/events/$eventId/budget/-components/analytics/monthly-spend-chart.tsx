import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { CalendarDays } from "lucide-react";
import { Area } from "@/components/charts/area";
import { ComposedChart } from "@/components/charts/composed-chart";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip, TooltipContent } from "@/components/charts/tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { formatCurrency, formatCurrencyCompact } from "@/utils/format-currency";
import type { MonthlySpendPoint } from "../../-types/analytics.types";
import { AnalyticsEmpty } from "./analytics-empty";

/**
 * Cash out per calendar month. The API groups by the recorded payment dates and
 * already returns the months in chronological order, so the series is plotted
 * as-is. `month` is a `YYYY-MM` key, which the chart parses into a date for the
 * time axis.
 */
export function MonthlySpendChart({ points }: { points: MonthlySpendPoint[] }) {
	const readPoint = (point: Record<string, unknown>) =>
		point as MonthlySpendPoint;

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<CalendarDays className="h-4 w-4" />
					Pagamentos por mês
				</CardTitle>
			</CardHeader>
			<CardContent>
				{points.length === 0 ? (
					<AnalyticsEmpty message="Ainda não há pagamentos registados." />
				) : (
					<ComposedChart
						data={points}
						xDataKey="month"
						aspectRatio="2.2 / 1"
						margin={{ top: 16, right: 16, bottom: 8, left: 68 }}
					>
						<Grid />
						<Area dataKey="amount" fillOpacity={0.25} />
						<XAxis />
						<YAxis formatValue={formatCurrencyCompact} numTicks={4} />
						<ChartTooltip
							showDatePill={false}
							content={({ point }) => {
								const month = readPoint(point);
								// The raw `YYYY-MM` key is shown as the title: the default
								// would format it as a day-level date.
								return (
									<TooltipContent
										title={month.month}
										rows={[
											{
												color: "var(--chart-line-primary)",
												label: "Pago",
												value: formatCurrency(month.amount),
											},
										]}
									/>
								);
							}}
						/>
					</ComposedChart>
				)}
			</CardContent>
		</Card>
	);
}
