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
import { StatChart } from "@/shared/components/charts";
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
 * renders it. The chart shows how much each module contributes to the total.
 */
export function BudgetStatsCard({ eventId }: BudgetStatsCardProps) {
	const summaryQuery = useBudgetSummary(eventId);

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

						{(summaryQuery.data?.breakdown.bySource.length ?? 0) > 0 && (
							<StatChart
								height={120}
								data={(summaryQuery.data?.breakdown.bySource ?? []).map(
									(entry) => ({
										label: entry.label,
										value: entry.planned,
									}),
								)}
							/>
						)}
					</div>
				</QueryState>

				<Button
					variant="ghost"
					size="sm"
					className="mt-1 h-auto p-0"
					render={<Link to="/events/$eventId/budget" params={{ eventId }} />}
				>
					Ver orçamento <ArrowRight size={4} />
				</Button>
			</CardContent>
		</Card>
	);
}
