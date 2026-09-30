import { StatsGrid } from "@/shared/components/metrics";
import { useEventStats } from "../../-queries/use-event-stats";
import { BudgetStatsCard } from "./budget-stats-card";
import { ScheduleStatsCard } from "./schedule-stats-card";
import { SuppliersStatsCard } from "./suppliers-stats-card";
import { TasksStatsCard } from "./tasks-stats-card";

interface EventStatsProps {
	eventId: string;
}

export function EventStats({ eventId }: EventStatsProps) {
	const stats = useEventStats(eventId);

	// Os quatro cards partilham a mesma densidade, por isso uma grelha 2x2
	// única: evita a célula vazia de uma grelha de 3 colunas com 2 cartões.
	return (
		<StatsGrid columns={2}>
			<BudgetStatsCard eventId={eventId} />
			<SuppliersStatsCard eventId={eventId} stats={stats.suppliers.data} />
			<TasksStatsCard eventId={eventId} stats={stats.tasks.data} />
			<ScheduleStatsCard eventId={eventId} stats={stats.schedules.data} />
		</StatsGrid>
	);
}
