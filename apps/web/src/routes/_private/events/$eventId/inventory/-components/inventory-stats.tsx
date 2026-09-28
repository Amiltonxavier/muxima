import type { InventoryStats as InventoryStatsDto } from "@muxima/api/shared/types/entities";
import { MetricProgressCard, StatsGrid } from "@/shared/components/metrics";
import { StatsCard } from "@/shared/components/stats-card/stats-card";

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
		<StatsGrid columns={3}>
			<StatsCard title="Total de produtos" value={stats.totalItems} />
			{/* A quantidade planeada vive no limite do progresso ("/ N") —
			    assim a relação adquirido/planeado fica explícita num só card. */}
			<MetricProgressCard
				title="Qtd. concluída"
				value={stats.totalCurrent}
				limit={stats.totalQuantity}
			/>
			<StatsCard title="Em falta" value={stats.totalRemaining} />
			<MetricProgressCard
				title="Progresso"
				value={stats.completedItems}
				limit={stats.totalItems}
				percentage={stats.completionPercentage}
				label={`${stats.completionPercentage}%`}
			/>
			{/*
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
				/>*/}
		</StatsGrid>
	);
}
