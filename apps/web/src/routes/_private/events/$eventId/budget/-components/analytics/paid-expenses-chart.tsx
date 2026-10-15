import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Wallet } from "lucide-react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip, TooltipContent } from "@/components/charts/tooltip";
import { QueryState } from "@/shared/components/states";
import { formatCurrency } from "@/utils/format-currency";
import { chartColorAt } from "../../-constants/analytics.constants";
import {
	type PaidExpense,
	usePaidExpenses,
} from "../../-queries/budget-queries";

/**
 * Saídas financeiras do evento: uma barra por despesa, dimensionada pelo total
 * efectivamente pago. Cobre as duas fontes de dinheiro — o inventário adquirido
 * e os serviços com fornecedor pago. A série chega já agregada de
 * `budget.getPaidExpenses` (pagamentos parciais somados, pendentes excluídos),
 * por isso este componente só apresenta — nomes longos levam barras horizontais
 * para ficarem legíveis.
 */
export function PaidExpensesChart({ eventId }: { eventId: string }) {
	const query = usePaidExpenses(eventId);
	const data = query.data ?? [];
	const hasData = data.length > 0;

	const paidColor = chartColorAt(1);
	const readExpense = (point: Record<string, unknown>) => point as PaidExpense;

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Wallet className="h-4 w-4" />
					Despesas pagas
				</CardTitle>
			</CardHeader>
			<CardContent>
				<QueryState
					state={{
						isLoading: query.isLoading,
						isError: query.isError,
						isEmpty: !hasData,
						hasData,
					}}
					emptyMessage="Ainda não há despesas pagas."
					onRetry={() => query.refetch()}
				>
					<BarChart
						data={data}
						xDataKey="label"
						orientation="horizontal"
						aspectRatio="2 / 1"
						margin={{ top: 8, right: 24, bottom: 8, left: 96 }}
					>
						<Grid horizontal={false} vertical />
						<Bar dataKey="value" fill={paidColor} lineCap="round" />
						<BarYAxis />
						<ChartTooltip
							showDatePill={false}
							content={({ point }) => {
								const expense = readExpense(point);
								return (
									<TooltipContent
										title={expense.label}
										rows={[
											{
												color: paidColor,
												label: "Pago",
												value: formatCurrency(expense.value),
											},
										]}
									/>
								);
							}}
						/>
					</BarChart>
				</QueryState>
			</CardContent>
		</Card>
	);
}
