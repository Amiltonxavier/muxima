import { MetricStatusList } from "@/shared/components/metrics";

/**
 * Linha "label — valor" usada nos cards de stats do evento.
 *
 * Consolidado sobre a biblioteca de métricas (`shared/components/metrics`):
 * preferir `MetricStatusList` (suporta status e progresso por linha) em código
 * novo. Mantido como fachada para os call sites existentes.
 */
export function StatRow({
	label,
	value,
}: {
	label: string;
	value: number | string;
}) {
	return <MetricStatusList items={[{ label, value }]} className="space-y-0" />;
}
