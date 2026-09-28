import { Card, CardContent } from "@muxima/ui/components/card";
import { Progress } from "@muxima/ui/components/progress";
import { formatCurrency } from "@/utils/format-currency";
import type { BudgetTotals } from "../-queries/budget-queries";

/**
 * How much is left to plan, and how much of the target is already committed.
 * A negative remainder means the plan overshoots the budget.
 */
export function BudgetAvailableCard({ totals }: { totals: BudgetTotals }) {
	const isOverBudget = (totals.remaining ?? 0) < 0;

	return (
		<Card>
			<CardContent className="space-y-2 pt-6">
				<div className="flex items-baseline justify-between text-sm">
					<span className="text-muted-foreground">
						Disponível para planeamento
					</span>
					<span
						className={
							isOverBudget ? "font-semibold text-destructive" : "font-semibold"
						}
					>
						{formatCurrency(totals.remaining ?? 0)}
					</span>
				</div>
				<Progress value={totals.usagePercentage} />
				{isOverBudget && (
					<p className="text-destructive text-xs">
						O planeado ultrapassa o disponível. Ajuste a meta ou revise os itens
						do inventário e os fornecedores.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
