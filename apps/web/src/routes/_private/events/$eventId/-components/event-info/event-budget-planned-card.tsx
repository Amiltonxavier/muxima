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
import { Area } from "@/components/charts/area";
import { ComposedChart } from "@/components/charts/composed-chart";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { XAxis } from "@/components/charts/x-axis";
import { QueryState } from "@/shared/components/states";
import { useBudgetSummary } from "@/shared/queries/budget-queries";
import { formatCurrency, formatCurrencyCompact } from "@/utils/format-currency";

interface EventBudgetPlannedCardProps {
	eventId: string;
}

/**
 * Hero card of the event-info bento — kept deliberately compact so the short
 * side cards keep their natural height. Everything is derived by the API: the
 * planned total, its split between inventory and suppliers (donut with the
 * total in the centre) and the cash-out per month (sparkline area chart).
 */
export function EventBudgetPlannedCard({
	eventId,
}: EventBudgetPlannedCardProps) {
	const summaryQuery = useBudgetSummary(eventId);

	const totals = summaryQuery.data?.totals;
	const breakdown = summaryQuery.data?.breakdown;

	const sourceDistribution = (breakdown?.bySource ?? [])
		.filter((entry) => entry.planned > 0)
		.map((entry) => ({
			key: entry.key,
			label: entry.label,
			value: entry.planned,
		}));

	const hasSourceBreakdown = sourceDistribution.length > 0;

	const monthlySpend = breakdown?.monthlySpend ?? [];

	return (
		<Card className="flex flex-col sm:col-span-2 lg:col-span-2 lg:row-span-2">
			<CardHeader className="pb-1">
				<CardTitle className="flex items-center gap-2 text-sm">
					<CreditCard className="h-4 w-4" />
					Orçamento planeado
				</CardTitle>
			</CardHeader>

			<CardContent className="flex flex-1 flex-col gap-3 p-4 pt-1">
				<QueryState
					state={{
						isLoading: summaryQuery.isLoading,
						isError: summaryQuery.isError,
						isEmpty: !summaryQuery.data,
						hasData: !!summaryQuery.data,
					}}
				>
					<div className="flex items-center gap-4">
						<div className="min-w-0 space-y-1.5">
							<p className="text-muted-foreground text-xs">Total planeado</p>
							<p className="truncate font-semibold text-2xl tracking-tight">
								{formatCurrency(totals?.planned ?? 0)}
							</p>

							{hasSourceBreakdown && (
								<p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
									{sourceDistribution.map((entry, index) => (
										<span key={entry.key} className="flex items-center gap-1.5">
											<span
												className="h-2 w-2 rounded-full"
												style={{
													backgroundColor: `var(--chart-${(index % 5) + 1})`,
												}}
											/>
											<span className="text-muted-foreground">
												{entry.label}
											</span>
											<span className="font-medium">
												{formatCurrencyCompact(entry.value)}
											</span>
										</span>
									))}
								</p>
							)}
						</div>

						{hasSourceBreakdown && (
							<div className="ml-auto shrink-0">
								<PieChart
									data={sourceDistribution.map(({ label, value }) => ({
										label,
										value,
									}))}
									size={104}
									innerRadius={38}
									padAngle={0.05}
									cornerRadius={4}
								>
									{sourceDistribution.map((entry, index) => (
										<PieSlice key={entry.key} index={index} />
									))}
									<PieCenter
										defaultLabel="Planeado"
										formatOptions={{
											notation: "compact",
											maximumFractionDigits: 1,
										}}
									/>
								</PieChart>
							</div>
						)}
					</div>

					<div className="space-y-1">
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">Utilização</span>
							<span>{totals?.usagePercentage ?? 0}%</span>
						</div>
						<Progress value={totals?.usagePercentage ?? 0} />
					</div>

					<div className="space-y-1 border-t pt-3">
						<p className="text-muted-foreground text-xs">Pagamentos por mês</p>

						{monthlySpend.length > 0 ? (
							<ComposedChart
								data={monthlySpend}
								xDataKey="month"
								aspectRatio="6 / 1"
								margin={{ top: 4, right: 4, bottom: 2, left: 4 }}
							>
								<Area dataKey="amount" fillOpacity={0.3} />
								<XAxis />
							</ComposedChart>
						) : (
							<p className="text-muted-foreground text-xs">
								Ainda não há pagamentos registados.
							</p>
						)}
					</div>
				</QueryState>

				<Button
					variant="ghost"
					size="sm"
					className="mt-auto h-auto p-0"
					render={<Link to="/events/$eventId/budget" params={{ eventId }} />}
				>
					Ver orçamento <ArrowRight className="ml-1 h-4 w-4" />
				</Button>
			</CardContent>
		</Card>
	);
}
