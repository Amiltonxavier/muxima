import { MetricCard, StatsGrid } from "@/shared/components/metrics";
import { formatCurrencyCompact } from "@/utils/format-currency";
import type { SupplierStatsDto } from "../-queries/suppliers-queries";

/**
 * All KPI values come pre-calculated from the backend stats endpoint — this
 * component only renders them.
 */
export function SupplierStats({ stats }: { stats?: SupplierStatsDto | null }) {
	if (!stats) {
		return null;
	}

	const overdue = stats.overdueCount ?? 0;

	return (
		<StatsGrid columns={4}>
			<MetricCard title="Total" value={stats.total ?? 0} />
			<MetricCard
				title="Pago"
				value={formatCurrencyCompact(stats.totalPaid ?? 0)}
			/>
			<MetricCard
				title="Por pagar"
				value={formatCurrencyCompact(stats.totalPending ?? 0)}
			/>
			<MetricCard
				title="Em atraso"
				value={
					overdue > 0 ? (
						<span className="text-destructive">{overdue}</span>
					) : (
						overdue
					)
				}
				description="fornecedores"
			/>
		</StatsGrid>
	);
}
