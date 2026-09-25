import type { InventoryStats as InventoryStatsDto } from "@muxima/api/shared/types/entities";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { AlertTriangle, PackagePlus, TrendingUp } from "lucide-react";
import { ChartLegend, DonutChart } from "@/shared/components/charts";

/**
 * KPI values come pre-calculated from the backend stats endpoint — this
 * component only renders them.
 */
export function InventoryAnalytics({
	stats,
}: {
	stats?: InventoryStatsDto | null;
}) {
	if (!stats) {
		return null;
	}

	const segments = [
		{
			label: "Concluídos",
			value: stats.completedItems,
			color: "var(--chart-2)",
		},
		{
			label: "Em progresso",
			value: stats.inProgressItems,
			color: "var(--chart-1)",
		},
		{ label: "Pendentes", value: stats.pendingItems, color: "var(--chart-3)" },
	];

	const alerts: string[] = [];
	if (stats.lowStockItems > 0) {
		alerts.push(`${stats.lowStockItems} itens com stock baixo`);
	}
	if (stats.outOfStockItems > 0) {
		alerts.push(`${stats.outOfStockItems} itens sem stock`);
	}

	return (
		<div className="grid gap-4 lg:grid-cols-3">
			<Card className="lg:col-span-2">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<PackagePlus className="h-4 w-4" />
						Estado dos produtos
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
					<DonutChart
						segments={segments}
						size={170}
						centerLabel="de itens"
						centerValue={stats.totalItems}
					/>
					<div className="w-full max-w-[240px] space-y-3">
						<ChartLegend
							items={[
								{
									label: "Concluídos",
									color: "var(--chart-2)",
									value: stats.completedItems,
								},
								{
									label: "Em progresso",
									color: "var(--chart-1)",
									value: stats.inProgressItems,
								},
								{
									label: "Pendentes",
									color: "var(--chart-3)",
									value: stats.pendingItems,
								},
							]}
						/>
						{alerts.length > 0 && (
							<div className="space-y-1">
								{alerts.map((alert) => (
									<div
										key={alert}
										className="flex items-center gap-2 border border-red-200 bg-red-50/60 px-3 py-2 text-red-700 text-sm"
									>
										<AlertTriangle className="h-4 w-4 shrink-0" />
										{alert}
									</div>
								))}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<TrendingUp className="h-4 w-4" />
						Movimentações
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="border p-3 text-center">
						<p className="text-muted-foreground text-xs">Qtd. de movimentos</p>
						<p className="font-semibold text-2xl">{stats.movementCount}</p>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="border p-3 text-center">
							<p className="text-muted-foreground text-xs">Stock baixo</p>
							<p className="font-semibold">{stats.lowStockItems}</p>
						</div>
						<div className="border p-3 text-center">
							<p className="text-muted-foreground text-xs">Sem stock</p>
							<p className="font-semibold">{stats.outOfStockItems}</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
