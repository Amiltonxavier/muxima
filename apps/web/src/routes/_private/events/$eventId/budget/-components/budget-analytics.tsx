import { QueryState } from "@/shared/components/states";
import { ExpenseAnalytics } from "../../-components/expense-analytics";
import type { BudgetSummary } from "../-queries/budget-queries";
import { BudgetCategoryChart } from "./analytics/budget-category-chart";
import { BudgetOverviewRing } from "./analytics/budget-overview-ring";
import { BudgetPaymentGauge } from "./analytics/budget-payment-gauge";
import { BudgetPaymentStatusChart } from "./analytics/budget-payment-status-chart";
import { BudgetSourceChart } from "./analytics/budget-source-chart";
import { MonthlySpendChart } from "./analytics/monthly-spend-chart";
import { OverdueSuppliersTable } from "./analytics/overdue-suppliers-table";
import { TopPendingSuppliersChart } from "./analytics/top-pending-suppliers-chart";

type BudgetAnalyticsProps = {
	summary?: BudgetSummary | null;
	isLoading: boolean;
	isError: boolean;
};

/**
 * The whole screen is a read model: the API owns every number, so this file
 * only decides which chart communicates each breakdown best. Nothing here sums,
 * averages or re-derives a figure.
 */
export function BudgetAnalytics({
	summary,
	isLoading,
	isError,
	eventId,
}: BudgetAnalyticsProps & { eventId: string }) {
	const totals = summary?.totals;
	const breakdown = summary?.breakdown;

	const hasData =
		(totals?.planned ?? 0) > 0 ||
		(totals?.spent ?? 0) > 0 ||
		(totals?.pending ?? 0) > 0;

	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: !hasData,
				hasData,
			}}
		>
			{totals && breakdown && (
				<div className="space-y-4">
					<ExpenseAnalytics eventId={eventId} />

					<div className="grid gap-4 lg:grid-cols-3">
						<div className="lg:col-span-2">
							<BudgetOverviewRing totals={totals} />
						</div>
						<BudgetPaymentGauge totals={totals} />
					</div>

					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						<BudgetSourceChart entries={breakdown.bySource} />
						<BudgetCategoryChart entries={breakdown.byCategory} />
						<BudgetPaymentStatusChart entries={breakdown.byPaymentStatus} />
					</div>

					<div className="grid gap-4 lg:grid-cols-3">
						<div className="lg:col-span-2">
							<MonthlySpendChart points={breakdown.monthlySpend} />
						</div>
						<OverdueSuppliersTable suppliers={breakdown.overdueSuppliers} />
					</div>

					<TopPendingSuppliersChart suppliers={breakdown.topPendingSuppliers} />
				</div>
			)}
		</QueryState>
	);
}
