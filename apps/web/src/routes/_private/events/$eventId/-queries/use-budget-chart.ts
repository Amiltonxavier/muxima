// event-charts/queries/use-budget-chart.ts

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function useBudgetChart(eventId: string) {
	return useQuery(
		orpc.dashboard.getBudgetChart.queryOptions({
			input: { eventId },
		}),
	);
}
