import { useEventStats } from "../../-queries/use-event-stats";
import { BudgetStatsCard } from "./budget-stats-card";
import { GuestsStatsCard } from "./guests-stats-card";
import { PendingTasksCard } from "./pending-tasks-card";
import { ScheduleStatsCard } from "./schedule-stats-card";
import { TasksStatsCard } from "./tasks-stats-card";
import { VendorsStatsCard } from "./vendors-stats-card";


interface EventStatsProps {
	eventId: string;
}

export function EventStats({ eventId }: EventStatsProps) {
	const stats = useEventStats(eventId);

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<GuestsStatsCard
				eventId={eventId}
				stats={stats.guests.data}
			/>

			<BudgetStatsCard
				eventId={eventId}
				stats={stats.budget.data}
			/>

			<TasksStatsCard
				eventId={eventId}
				stats={stats.tasks.data}
			/>

			<VendorsStatsCard
				eventId={eventId}
				stats={stats.vendors.data}
			/>

			<PendingTasksCard
				eventId={eventId}
				count={stats.tasks.data?.todo ?? 0}
			/>

			<ScheduleStatsCard
				eventId={eventId}
				stats={stats.schedules.data}
			/>
		</div>
	);
}