import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Progress } from "@muxima/ui/components/progress";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CreditCard } from "lucide-react";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { ChartLegend } from "@/shared/components/charts";
import { QueryState } from "@/shared/components/states";
import { useBudgetSummary } from "@/shared/queries/budget-queries";
import { formatCurrency } from "@/utils/format-currency";
import { StatRow } from "./stat-row";

interface BudgetStatsCardProps {
	eventId: string;
}

/**
 * Compact budget summary for the event detail page. Every figure — planned,
 * spent, pending, per-module breakdown — is computed by the API; the card only
 * renders it. The pie shows how much each budget source contributes to the
 * total, from the same backend breakdown the totals come from.
 */
export function BudgetStatsCard({ eventId }: BudgetStatsCardProps) {
	const summaryQuery = useBudgetSummary(eventId);

	// O `PieChart` distributes slices by index; a source planned at 0 adds no
	// information and would only dilute the reading.
	const sourceDistribution = (summaryQuery.data?.breakdown.bySource ?? [])
		.filter((entry) => entry.planned > 0)
		.map((entry) => ({ label: entry.label, value: entry.planned }));

	const hasSourceBreakdown = sourceDistribution.length > 0;

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
						isEmpty: !summaryQuery.data,
						hasData: !!summaryQuery.data,
					}}
				>
					<div className="space-y-3">
						<StatRow
							label="Total planeado"
							value={formatCurrency(summaryQuery.data?.totals.planned ?? 0)}
						/>
						<StatRow
							label="Gasto"
							value={formatCurrency(summaryQuery.data?.totals.spent ?? 0)}
						/>
						<StatRow
							label="Por pagar"
							value={formatCurrency(summaryQuery.data?.totals.pending ?? 0)}
						/>

						<div className="pt-1">
							<div className="mb-1 flex justify-between text-xs">
								<span className="text-muted-foreground">Utilização</span>
								<span>{summaryQuery.data?.totals.usagePercentage ?? 0}%</span>
							</div>
							<Progress
								value={summaryQuery.data?.totals.usagePercentage ?? 0}
							/>
						</div>

						{hasSourceBreakdown && (
							<div className="space-y-3 border-t pt-3">
								<p className="text-muted-foreground text-xs">
									Distribuição por fonte
								</p>

								<div className="flex justify-center">
									<PieChart data={sourceDistribution} size={180}>
										{sourceDistribution.map((slice, index) => (
											<PieSlice key={slice.label} index={index} />
										))}
									</PieChart>
								</div>

								{/* A legenda espelha a paleta que o `PieChart` usa por
								    ordem de índice, para que cor e rótulo coincidam. */}
								<ChartLegend
									items={sourceDistribution.map((slice, index) => ({
										label: slice.label,
										color: `var(--chart-${(index % 5) + 1})`,
										value: formatCurrency(slice.value),
									}))}
								/>
							</div>
						)}
					</div>
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
