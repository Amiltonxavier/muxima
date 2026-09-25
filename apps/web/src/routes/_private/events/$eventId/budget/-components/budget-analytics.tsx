import type { BudgetStats } from "@muxima/api/shared/types/entities";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { CircleDollarSign, Wallet } from "lucide-react";
import {
	ChartLegend,
	DonutChart,
	ProgressDonut,
} from "@/shared/components/charts";
import { QueryState } from "@/shared/components/states";
import { formatCurrency } from "@/utils/format-currency";

type BudgetAnalyticsProps = {
	stats?: BudgetStats | null;
	isLoading: boolean;
	isError: boolean;
};

export function BudgetAnalytics({
	stats,
	isLoading,
	isError,
}: BudgetAnalyticsProps) {
	const planned = stats?.plannedAmount ?? 0;
	const spent = stats?.totalSpent ?? 0;
	const available = stats?.available ?? 0;
	const utilizationRate = stats?.utilizationRate ?? 0;
	const paymentRate = stats?.paymentRate ?? 0;

	const segments = [
		{ label: "Gasto", value: Math.max(spent, 0), color: "var(--chart-1)" },
		{
			label: "Disponível",
			value: Math.max(available, 0),
			color: "var(--chart-3)",
		},
	];

	const hasData = planned > 0 || spent > 0;

	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: !hasData && !isLoading,
				hasData,
			}}
		>
			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Wallet className="h-4 w-4" />
							Aproveitamento do orçamento
						</CardTitle>
						<span className="text-muted-foreground text-sm">
							{utilizationRate}% utilizado
						</span>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
						<DonutChart
							segments={segments}
							size={170}
							centerLabel="disponível"
							centerValue={formatCurrency(Math.max(available, 0))}
						/>
						<div className="w-full max-w-[220px] space-y-4">
							<ChartLegend
								items={[
									{
										label: "Gasto",
										color: "var(--chart-1)",
										value: formatCurrency(spent),
									},
									{
										label: "Disponível",
										color: "var(--chart-3)",
										value: formatCurrency(Math.max(available, 0)),
									},
									{
										label: "Reserva",
										color: "var(--chart-2)",
										value: formatCurrency(stats?.reserveAmount ?? 0),
									},
								]}
							/>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CircleDollarSign className="h-4 w-4" />
							Pagamentos
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex justify-center">
							<ProgressDonut
								value={paymentRate}
								max={100}
								color="var(--chart-2)"
								size={140}
								centerLabel="de pagamento"
							/>
						</div>

						<div className="grid grid-cols-3 gap-2 text-center">
							<div className="border p-2">
								<p className="text-muted-foreground text-xs">Pago</p>
								<p className="font-semibold">{paymentRate}%</p>
							</div>
							<div className="border p-2">
								<p className="text-muted-foreground text-xs">Despesas</p>
								<p className="font-semibold">{stats?.expenseCount ?? 0}</p>
							</div>
							<div className="border p-2">
								<p className="text-muted-foreground text-xs">Pendentes</p>
								<p className="font-semibold">{stats?.pendingExpenses ?? 0}</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</QueryState>
	);
}
