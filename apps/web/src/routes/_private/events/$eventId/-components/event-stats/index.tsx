import { StatsGrid } from "@/shared/components/metrics";
import { useEventStats } from "../../-queries/use-event-stats";
import { BudgetStatsCard } from "./budget-stats-card";
import { CountdownStatsCard } from "./countdown-stats-card";
import { ScheduleStatsCard } from "./schedule-stats-card";
import { SuppliersStatsCard } from "./suppliers-stats-card";
import { TasksStatsCard } from "./tasks-stats-card";

interface EventStatsProps {
	eventId: string;
}

export function EventStats({ eventId }: EventStatsProps) {
	const stats = useEventStats(eventId);

	return (
		<div className="space-y-4">
			<StatsGrid columns={3}>
				<CountdownStatsCard eventId={eventId} />
				<BudgetStatsCard eventId={eventId} />
				<SuppliersStatsCard eventId={eventId} stats={stats.suppliers.data} />
			</StatsGrid>

			<StatsGrid columns={3}>
				<TasksStatsCard eventId={eventId} stats={stats.tasks.data} />

				<ScheduleStatsCard eventId={eventId} stats={stats.schedules.data} />
			</StatsGrid>
		</div>
	);
}
