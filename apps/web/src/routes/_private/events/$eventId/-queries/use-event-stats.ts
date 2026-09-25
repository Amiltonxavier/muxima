// event-stats/queries/use-event-stats.ts

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function useEventStats(eventId: string) {
	const guests = useQuery(
		orpc.guests.getGuestStats.queryOptions({
			input: { eventId },
		}),
	);

	const tasks = useQuery(
		orpc.tasks.getStats.queryOptions({
			input: { eventId },
		}),
	);

	const budget = useQuery(
		orpc.budget.getStats.queryOptions({
			input: { eventId },
		}),
	);

	const vendors = useQuery(
		orpc.vendors.getStats.queryOptions({
			input: { eventId },
		}),
	);

	const schedules = useQuery(
		orpc.tasks.getScheduleStats.queryOptions({
			input: { eventId },
		}),
	);

	return {
		guests,
		tasks,
		budget,
		vendors,
		schedules,
	};
}
