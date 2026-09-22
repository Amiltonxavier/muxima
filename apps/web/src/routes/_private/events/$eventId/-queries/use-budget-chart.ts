// event-charts/queries/use-budget-chart.ts

import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";


export function useBudgetChart(eventId: string) {
	return useQuery(
		orpc.dashboard.getBudgetChart.queryOptions({
			input: { eventId },
		}),
	);
}