/**
 * Biblioteca de métricas do Muxima — building blocks reutilizáveis para
 * apresentação de KPIs, progresso, breakdowns e status.
 *
 * @example
 * ```tsx
 * <StatsGrid columns={4}>
 *   <MetricCard title="Convidados" value={120} icon={<Users />} />
 *   <MetricProgressCard title="Mesas" value={7} limit={10} tone="success" />
 *   <MetricBreakdownCard title="Tarefas" value={24} items={[...]} />
 *   <MetricRadialCard title="Conclusão" value={72} label="concluído" />
 * </StatsGrid>
 * ```
 */

export {
	MetricBreakdownCard,
	type MetricBreakdownCardProps,
	type MetricBreakdownItem,
} from "./metric-breakdown-card";
export { MetricCard, type MetricCardProps } from "./metric-card";
export {
	MetricProgressCard,
	type MetricProgressCardProps,
} from "./metric-progress-card";
export {
	MetricRadialCard,
	type MetricRadialCardProps,
	RadialProgress,
	type RadialProgressProps,
} from "./metric-radial-card";
export {
	type MetricStatusItem,
	MetricStatusList,
	type MetricStatusListProps,
	type MetricStatusTone,
} from "./metric-status-list";
export {
	type MetricTone,
	metricToneBarClass,
	metricToneTextClass,
	SegmentedProgress,
	type SegmentedProgressProps,
	type SegmentedProgressSegment,
	safePercentage,
} from "./segmented-progress";
export { StatsGrid, type StatsGridProps } from "./stats-grid";
