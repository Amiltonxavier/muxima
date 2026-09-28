import { MetricCard, StatsGrid } from "@/shared/components/metrics";
import { formatCurrency } from "@/utils/format-currency";
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
			<MetricCard
				title="Montante contratado"
				value={formatCurrency(stats.totalPrice ?? 0)}
			/>
			<MetricCard title="Pago" value={formatCurrency(stats.totalPaid ?? 0)} />
			<MetricCard
				title="Por pagar"
				value={formatCurrency(stats.totalPending ?? 0)}
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
