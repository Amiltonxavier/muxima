import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Wallet } from "lucide-react";
import { Ring } from "@/components/charts/ring";
import { RingCenter } from "@/components/charts/ring-center";
import { RingChart } from "@/components/charts/ring-chart";
import { formatCurrency } from "@/utils/format-currency";
import type { BudgetTotals } from "../../-queries/budget-queries";
import { MoneyRow } from "./money-row";

/**
 * How much of the target is already committed, against how much is still free.
 *
 * A ring is the honest encoding here: `usagePercentage` is a single ratio
 * against the whole, and `available` is the *ceiling* rather than the leftover
 * of a total, so a pie of Gasto / Por pagar / Disponível would imply a
 * part-to-whole that does not exist. The three amounts sit next to the ring as
 * labelled rows instead, and the reserve is listed separately because it is
 * excluded from `available` by the API.
 */
export function BudgetOverviewRing({ totals }: { totals: BudgetTotals }) {
	const { totalBudget, reserve, available, spent, pending, remaining } = totals;
	const { usagePercentage } = totals;
	const isOverBudget = remaining < 0;

	// The ring fills 0–100; an over-budget ratio is reported by the row below.
	const fill = Math.min(Math.max(usagePercentage, 0), 100);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-4">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Wallet className="h-4 w-4" />
					Aproveitamento do orçamento
				</CardTitle>
				<span className="shrink-0 text-muted-foreground text-sm">
					{usagePercentage}% utilizado
				</span>
			</CardHeader>
			<CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
				<RingChart
					data={[{ label: "Utilização", value: fill, maxValue: 100 }]}
					size={180}
					strokeWidth={16}
				>
					<Ring index={0} />
					<RingCenter defaultLabel="utilizado" suffix="%" />
				</RingChart>

				<dl className="w-full max-w-xs space-y-2">
					<MoneyRow label="Meta" value={formatCurrency(totalBudget)} />
					<MoneyRow label="Reserva" value={formatCurrency(reserve)} />
					<MoneyRow label="Disponível" value={formatCurrency(available)} />
					<MoneyRow label="Gasto" value={formatCurrency(spent)} />
					<MoneyRow label="Por pagar" value={formatCurrency(pending)} />
					<MoneyRow
						label="Restante"
						value={formatCurrency(remaining)}
						tone={isOverBudget ? "destructive" : undefined}
					/>
				</dl>

				{isOverBudget && (
					<p className="w-full text-destructive text-xs">
						O planeado ultrapassa o disponível. Ajuste a meta ou revise os itens
						do inventário e os fornecedores.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
