import { Card, CardContent, CardHeader } from "@muxima/ui/components/card";
import { CheckCircle2, Circle, ListChecks, Wand2 } from "lucide-react";
import { MetricProgressCard, StatsGrid } from "@/shared/components/metrics";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import type { ChecklistAnalytics } from "../-queries/checklist-queries";

/**
 * Todos os KPI vêm pré-calculados de `checklist.getStats` — este componente só
 * os apresenta. O skeleton mantém a grelha estável enquanto o resumo carrega.
 */
export function ChecklistStats({
	stats,
	isLoading,
}: {
	stats?: ChecklistAnalytics;
	isLoading: boolean;
}) {
	if (isLoading) {
		return (
			<StatsGrid columns={4}>
				{["progresso", "concluidos", "pendentes", "alimentacao"].map((id) => (
					<Card key={id}>
						<CardHeader>
							<div className="h-4 w-20 animate-pulse rounded bg-muted" />
						</CardHeader>
						<CardContent>
							<div className="h-8 w-24 animate-pulse rounded bg-muted" />
						</CardContent>
					</Card>
				))}
			</StatsGrid>
		);
	}

	return (
		<StatsGrid columns={4}>
			<MetricProgressCard
				title="Progresso"
				value={stats?.completed ?? 0}
				limit={stats?.total ?? 0}
				percentage={stats?.completionPercentage}
				label={`${stats?.completionPercentage ?? 0}%`}
				icon={<ListChecks className="h-4 w-4" />}
			/>
			<StatsCard
				title="Concluídos"
				value={stats?.completed ?? 0}
				description={
					(stats?.autoManaged ?? 0) > 0
						? `${stats?.autoManaged} automáticos`
						: undefined
				}
				icon={<CheckCircle2 className="h-4 w-4" />}
			/>
			<StatsCard
				title="Pendentes"
				value={(stats?.pending ?? 0) + (stats?.inProgress ?? 0)}
				description={
					(stats?.overdue ?? 0) > 0 ? `${stats?.overdue} em atraso` : undefined
				}
				icon={<Circle className="h-4 w-4" />}
			/>
			<StatsCard
				title="Alimentação"
				value={`${stats?.foodPlan.completionPercentage ?? 0}%`}
				description={`${stats?.foodPlan.completedItems ?? 0} de ${stats?.foodPlan.totalItems ?? 0} itens`}
				icon={<Wand2 className="h-4 w-4" />}
			/>
		</StatsGrid>
	);
}
