import { useGuestChart } from "../../-queries/use-guest-chart";
import { GuestCapacityChart } from "./guest-capacity-chart";

interface EventChartsProps {
	eventId: string;
}

export function EventCharts({ eventId }: EventChartsProps) {
	const guestChartQuery = useGuestChart(eventId);

	const guestData = guestChartQuery.data;

	if (!guestData) {
		return null;
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<GuestCapacityChart data={guestData} />
		</div>
	);
}
