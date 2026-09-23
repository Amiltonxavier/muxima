import type { InventoryStats as InventoryStatsDto } from "@muxima/api/shared/types/entities";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import { formatCurrency } from "@/utils/format-currency";

/**
 * All KPI values come pre-calculated from the backend stats endpoint — this
 * component only renders them.
 */
export function InventoryStats({
	stats,
}: {
	stats?: InventoryStatsDto | null;
}) {
	if (!stats) {
		return null;
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<StatsCard title="Total de produtos" value={stats.totalItems} />
			<StatsCard title="Qtd. planeada" value={stats.totalQuantity} />
			<StatsCard
				title="Qtd. concluída"
				value={stats.totalCurrent}
				description={`de ${stats.totalQuantity}`}
			/>
			<StatsCard title="Em falta" value={stats.totalRemaining} />
			<StatsCard title="Para o salão" value={stats.totalVenue} />
			<StatsCard
				title="Progresso"
				value={`${stats.completionPercentage}%`}
				description={`${stats.completedItems}/${stats.totalItems} concluídos`}
			/>
			<StatsCard
				title="Valor total"
				value={
					<span className="text-emerald-600">
						{formatCurrency(stats.totalValue)}
					</span>
				}
			/>
			<StatsCard
				title="Valor concluído"
				value={
					<span className="text-blue-600">
						{formatCurrency(stats.completedValue)}
					</span>
				}
			/>
			<StatsCard
				title="Valor pendente"
				value={
					<span className="text-amber-600">
						{formatCurrency(stats.pendingValue)}
					</span>
				}
			/>
		</div>
	);
}
