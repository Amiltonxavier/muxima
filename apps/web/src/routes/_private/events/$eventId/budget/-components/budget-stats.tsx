import { Card, CardContent, CardHeader } from "@muxima/ui/components/card";
import { Target } from "lucide-react";
import { StatsGrid } from "@/shared/components/metrics";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import { formatCurrency, formatCurrencyCompact } from "@/utils/format-currency";
import type { BudgetTotals } from "../-queries/budget-queries";

/**
 * Every KPI comes pre-calculated from `budget.getSummary` — this component only
 * renders it. The skeleton keeps the grid height stable while the summary
 * loads, since the cards below it reflow when they arrive.
 */
export function BudgetStats({
	totals,
	isLoading,
}: {
	totals?: BudgetTotals;
	isLoading: boolean;
}) {
	if (isLoading) {
		return (
			<StatsGrid columns={4}>
				{["meta", "planeado", "pago", "por-pagar"].map((id) => (
					<Card key={id}>
						<CardHeader>
							<div className="h-4 w-20 animate-pulse rounded bg-muted" />
						</CardHeader>
						<CardContent>
							<div className="h-8 w-28 animate-pulse rounded bg-muted" />
						</CardContent>
					</Card>
				))}
			</StatsGrid>
		);
	}

	const reserve = totals?.reserve ?? 0;
	const overdue = totals?.overdue ?? 0;

	return (
		<StatsGrid columns={4}>
			<StatsCard
				title="Meta"
				value={formatCurrencyCompact(totals?.totalBudget ?? 0)}
				description={
					reserve > 0 ? `reserva ${formatCurrency(reserve)}` : undefined
				}
				icon={<Target className="h-4 w-4" />}
			/>
			<StatsCard
				title="Planeado"
				value={formatCurrencyCompact(totals?.planned ?? 0)}
				description={`${totals?.usagePercentage ?? 0}% da meta`}
			/>
			<StatsCard
				title="Pago"
				value={formatCurrencyCompact(totals?.spent ?? 0)}
				description={`${totals?.paymentPercentage ?? 0}% do planeado`}
			/>
			<StatsCard
				title="Por pagar"
				value={formatCurrencyCompact(totals?.pending ?? 0)}
				description={
					overdue > 0 ? `${formatCurrency(overdue)} em atraso` : undefined
				}
			/>
		</StatsGrid>
	);
}
