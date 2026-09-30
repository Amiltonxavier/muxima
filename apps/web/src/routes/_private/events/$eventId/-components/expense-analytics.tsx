import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@muxima/ui/components/tabs";
import { ChartColumn } from "lucide-react";
import { useState } from "react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip, TooltipContent } from "@/components/charts/tooltip";
import { QueryState } from "@/shared/components/states";
import { useExpenseAnalytics } from "@/shared/queries/budget-queries";
import { formatCurrency } from "@/utils/format-currency";

type ExpenseGranularity = "daily" | "monthly";

type ExpenseAnalyticsProps = {
	/** Evento em causa; a query só corre com id válido. */
	eventId: string;
	className?: string;
};

/**
 * Gastos do evento ao longo do tempo, por dia ou por mês.
 *
 * Todos os números vêm do backend (`budget.getExpenseAnalytics`), agregados
 * dentro do período automático do evento; este componente apenas escolhe a
 * série a grafar e formata moeda.
 */
export function ExpenseAnalytics({
	eventId,
	className,
}: ExpenseAnalyticsProps) {
	const [granularity, setGranularity] = useState<ExpenseGranularity>("monthly");
	const query = useExpenseAnalytics(eventId);

	const data = query.data;
	const series = granularity === "daily" ? data?.daily : data?.monthly;
	const hasData = (series?.length ?? 0) > 0;

	return (
		<Card className={className}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<ChartColumn className="h-4 w-4" />
					Gastos ao longo do tempo
				</CardTitle>
				<Tabs
					value={granularity}
					onValueChange={(v) => setGranularity(v as ExpenseGranularity)}
				>
					<TabsList>
						<TabsTrigger value="daily">Dia</TabsTrigger>
						<TabsTrigger value="monthly">Mês</TabsTrigger>
					</TabsList>
				</Tabs>
			</CardHeader>
			<CardContent>
				<QueryState
					state={{
						isLoading: query.isLoading,
						isError: query.isError,
						isEmpty: !hasData,
						hasData,
					}}
				>
					{data && (
						<div>
							{data.period && (
								<p className="mb-2 text-muted-foreground text-xs">
									Período: {data.period.from} → {data.period.to}
								</p>
							)}
							<BarChart
								data={series ?? []}
								xDataKey={granularity === "daily" ? "date" : "month"}
								aspectRatio="2.4 / 1"
								margin={{ top: 16, right: 16, bottom: 8, left: 68 }}
							>
								<Grid />
								<Bar
									dataKey="amount"
									fill="var(--chart-line-primary)"
									lineCap="round"
								/>
								<BarXAxis showAllLabels={granularity === "monthly"} />
								<BarYAxis />
								<ChartTooltip
									showDatePill={false}
									content={({ point }) => {
										const label =
											granularity === "daily" ? point.date : point.month;
										const amount = Number(point.amount ?? 0);
										return (
											<TooltipContent
												title={String(label ?? "")}
												rows={[
													{
														color: "var(--chart-line-primary)",
														label: "Gasto",
														value: formatCurrency(amount),
													},
												]}
											/>
										);
									}}
								/>
							</BarChart>
						</div>
					)}
				</QueryState>
			</CardContent>
		</Card>
	);
}
