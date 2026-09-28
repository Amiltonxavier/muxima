import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { CircleDollarSign } from "lucide-react";
import { Gauge } from "@/components/charts/gauge";
import { formatCurrency } from "@/utils/format-currency";
import type { BudgetTotals } from "../../-queries/budget-queries";
import { MoneyRow } from "./money-row";

/**
 * How much of what was committed has actually been settled. A gauge fits a
 * single value against a fixed 100% ceiling better than a pie, which would need
 * a second slice to say nothing.
 */
export function BudgetPaymentGauge({ totals }: { totals: BudgetTotals }) {
	const { spent, pending, overdue, paymentPercentage } = totals;
	const fill = Math.min(Math.max(paymentPercentage, 0), 100);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<CircleDollarSign className="h-4 w-4" />
					Pagamentos
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Gauge
					value={fill}
					centerValue={paymentPercentage}
					defaultLabel="pago"
					suffix="%"
					minWidth={200}
				/>

				<dl className="space-y-2">
					<MoneyRow label="Pago" value={formatCurrency(spent)} />
					<MoneyRow label="Por pagar" value={formatCurrency(pending)} />
					<MoneyRow
						label="Em atraso"
						value={formatCurrency(overdue)}
						tone={overdue > 0 ? "destructive" : undefined}
					/>
				</dl>
			</CardContent>
		</Card>
	);
}
