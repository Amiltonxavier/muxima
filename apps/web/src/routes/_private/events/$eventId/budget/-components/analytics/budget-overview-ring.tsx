import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Wallet } from "lucide-react";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";

import { formatCurrency } from "@/utils/format-currency";
import type { BudgetTotals } from "../../-queries/budget-queries";
import { MoneyRow } from "./money-row";

const CHART_SIZE = 180;
const INNER_RADIUS = 58;

export function BudgetOverviewRing({ totals }: { totals: BudgetTotals }) {
	const {
		totalBudget,
		reserve,
		available,
		spent,
		pending,
		remaining,
		usagePercentage,
	} = totals;

	const isOverBudget = remaining < 0;
	const usage = Math.min(Math.max(usagePercentage, 0), 100);

	const chartData = [
		{
			label: "Gasto",
			value: usage,
			color: "var(--chart-1)",
		},
		{
			label: "Disponível",
			value: Math.max(100 - usage, 0),
			color: "var(--chart-2)",
		},
	];

	return (
		<Card>
			<CardHeader className="flex h-full flex-row items-center justify-between gap-4">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Wallet className="h-4 w-4" />
					Aproveitamento do orçamento
				</CardTitle>

				<span className="shrink-0 text-muted-foreground text-sm">
					{usagePercentage}% utilizado
				</span>
			</CardHeader>

			<CardContent className="grid gap-8 sm:grid-cols-[minmax(220px,0.8fr)_1.2fr] sm:items-center">
				<div className="flex min-h-full items-center justify-center">
					<PieChart
						data={chartData}
						size={CHART_SIZE}
						innerRadius={INNER_RADIUS}
						padAngle={0.02}
					>
						{chartData.map((_, index) => (
							<PieSlice
								key={chartData[index].label}
								index={index}
								hoverEffect="grow"
								hoverOffset={6}
								showGlow={false}
							/>
						))}

						<PieCenter defaultLabel="utilizado" suffix="%" />
					</PieChart>
				</div>

				<div className="min-w-0">
					<dl className="space-y-2">
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
						<p className="mt-4 text-destructive text-xs">
							O planeado ultrapassa o disponível. Ajuste a meta ou reveja os
							itens do inventário e os fornecedores.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
