
import { useBudgetChart } from "../../-queries/use-budget-chart";
import { useGuestChart } from "../../-queries/use-guest-chart";
import { BudgetSummaryChart } from "./budget-summary-chart";
import { GuestCapacityChart } from "./guest-capacity-chart";



interface EventChartsProps {
    eventId: string;
}

export function EventCharts({ eventId }: EventChartsProps) {
    const guestChartQuery = useGuestChart(eventId);
    const budgetChartQuery = useBudgetChart(eventId);

    const guestData = guestChartQuery.data;
    const budgetData = budgetChartQuery.data;

    if (!guestData && !budgetData) {
        return null;
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <GuestCapacityChart data={guestData} />

            <BudgetSummaryChart data={budgetData} />
        </div>
    );
}