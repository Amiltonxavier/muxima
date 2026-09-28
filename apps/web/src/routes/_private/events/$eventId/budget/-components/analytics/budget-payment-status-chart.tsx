import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { CircleCheck } from "lucide-react";
import { useMemo } from "react";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { ChartLegend } from "@/shared/components/charts";
import { formatCurrency } from "@/utils/format-currency";
import { chartColorAt } from "../../-constants/analytics.constants";
import type { BudgetEntry } from "../../-types/analytics.types";
import { AnalyticsEmpty } from "./analytics-empty";

/**
 * How the outstanding money is distributed across payment states. The slices
 * come straight from the API, so only the states the data actually contains are
 * drawn. The centre totals what is still open across the states shown.
 */
export function BudgetPaymentStatusChart({
	entries,
}: {
	entries: BudgetEntry[];
}) {
	const data = useMemo(
		() =>
			entries.map((entry, index) => ({
				label: entry.label,
				value: entry.pending,
				color: chartColorAt(index),
			})),
		[entries],
	);

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm">
					<CircleCheck className="h-4 w-4" />
					Estado de pagamento
				</CardTitle>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<AnalyticsEmpty message="Sem estados de pagamento." />
				) : (
					<div className="space-y-4">
						<div className="flex justify-center">
							<PieChart data={data} innerRadius={52} size={168}>
								{data.map((slice, index) => (
									<PieSlice key={slice.label} index={index} />
								))}
								<PieCenter defaultLabel="em aberto" suffix=" Kz" />
							</PieChart>
						</div>

						<ChartLegend
							items={data.map((slice, index) => ({
								label: slice.label,
								color: slice.color,
								value: `${formatCurrency(slice.value)} · ${entries[index].count}`,
							}))}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
