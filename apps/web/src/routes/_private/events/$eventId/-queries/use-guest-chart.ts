// event-charts/queries/use-guest-chart.ts

import { orpc } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";


export function useGuestChart(eventId: string) {
	return useQuery(
		orpc.dashboard.getGuestChart.queryOptions({
			input: { eventId },
		}),
	);
}