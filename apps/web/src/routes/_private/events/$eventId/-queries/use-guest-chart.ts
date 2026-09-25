// event-charts/queries/use-guest-chart.ts

import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function useGuestChart(eventId: string) {
	return useQuery(
		orpc.dashboard.getGuestChart.queryOptions({
			input: { eventId },
		}),
	);
}
