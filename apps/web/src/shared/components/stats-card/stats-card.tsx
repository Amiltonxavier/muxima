import { MetricCard } from "@/shared/components/metrics";

/**
 * Card de KPI simples.
 *
 * Consolidado sobre a biblioteca de métricas (`shared/components/metrics`):
 * esta é agora apenas uma fachada de compatibilidade para os call sites
 * existentes. Preferir `MetricCard` em código novo.
 */
export function StatsCard(props: Parameters<typeof MetricCard>[0]) {
	return <MetricCard {...props} />;
}
