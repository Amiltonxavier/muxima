import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CreditCard } from "lucide-react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip, TooltipContent } from "@/components/charts/tooltip";
import { QueryState } from "@/shared/components/states";
import { useBudgetSummary } from "@/shared/queries/budget-queries";
import { formatCurrency } from "@/utils/format-currency";

interface BudgetStatsCardProps {
	eventId: string;
}

/**
 * Compact budget summary for the event detail page. The bar chart compares the
 * three figures the backend already computes — planned, spent and available —
 * straight from the summary totals. The card renders them and nothing else.
 */
export function BudgetStatsCard({ eventId }: BudgetStatsCardProps) {
	const summaryQuery = useBudgetSummary(eventId);

	const totals = summaryQuery.data?.totals;
	const metrics = totals
		? [
				{ label: "Planeado", value: totals.planned },
				{ label: "Gasto", value: totals.spent },
				{ label: "Disponível", value: totals.available },
			]
		: [];

	const barColor = "var(--chart-1)";
	const readMetric = (point: Record<string, unknown>) =>
		point as { label: string; value: number };

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<CreditCard className="h-4 w-4" />
					Orçamento
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-3">
				<QueryState
					state={{
						isLoading: summaryQuery.isLoading,
						isError: summaryQuery.isError,
						isEmpty: metrics.length === 0,
						hasData: metrics.length > 0,
					}}
					emptyMessage="Ainda não há dados de orçamento."
					onRetry={() => summaryQuery.refetch()}
				>
					<BarChart
						data={metrics}
						xDataKey="label"
						aspectRatio="2 / 1"
						margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
					>
						<Grid />
						<Bar
							dataKey="value"
							fill={barColor}
							stroke={barColor}
							lineCap="round"
						/>
						<BarXAxis showAllLabels />
						<ChartTooltip
							content={({ point }) => {
								const metric = readMetric(point);
								return (
									<TooltipContent
										title={metric.label}
										rows={[
											{
												color: barColor,
												label: "Valor",
												value: formatCurrency(metric.value),
											},
										]}
									/>
								);
							}}
						/>
					</BarChart>
				</QueryState>

				<Button
					variant="ghost"
					size="sm"
					className="mt-1 h-auto p-0"
					render={<Link to="/events/$eventId/budget" params={{ eventId }} />}
				>
					Ver orçamento <ArrowRight className="ml-1 h-4 w-4" />
				</Button>
			</CardContent>
		</Card>
	);
}
