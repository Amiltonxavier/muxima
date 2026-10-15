import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { TrendingUp } from "lucide-react";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip, TooltipContent } from "@/components/charts/tooltip";
import { QueryState } from "@/shared/components/states";
import { formatCurrency } from "@/utils/format-currency";
import {
	type InventoryCostPoint,
	useInventoryCostliestItems,
} from "../-queries/inventory-queries";

/**
 * Itens mais caros do inventário: uma barra por item, dimensionada pelo custo
 * total (`plannedQuantity x unitPrice`). A série chega já ordenada e limitada
 * pelo backend (`inventory.getCostliest`), por isso este componente só
 * apresenta — nomes longos levam barras horizontais para ficarem legíveis.
 */
export function InventoryCostliestChart({ eventId }: { eventId: string }) {
	const query = useInventoryCostliestItems(eventId);
	const data = query.data ?? [];
	const hasData = data.length > 0;

	const costColor = "var(--chart-1)";
	const readItem = (point: Record<string, unknown>) =>
		point as InventoryCostPoint;

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<TrendingUp className="h-4 w-4" />
					Itens mais caros
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
					emptyMessage="Ainda não há itens com custo definido."
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
						<Bar dataKey="value" fill={costColor} lineCap="round" />
						<BarYAxis />
						<ChartTooltip
							showDatePill={false}
							content={({ point }) => {
								const item = readItem(point);
								return (
									<TooltipContent
										title={item.label}
										rows={[
											{
												color: costColor,
												label: "Custo total",
												value: formatCurrency(item.value),
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
