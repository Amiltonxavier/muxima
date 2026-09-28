import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Users, UtensilsCrossed } from "lucide-react";
import { useMemo } from "react";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { ChartLegend } from "@/shared/components/charts";
import { QueryState } from "@/shared/components/states";
import { useGuestStats } from "@/shared/queries/guest-queries";
import { useTableStats } from "@/shared/queries/table-queries";
import { EventPreparationFunnel } from "./event-preparation-funnel";

type EventPreparationAnalyticsProps = {
	eventId: string;
};

export function EventPreparationAnalytics({
	eventId,
}: EventPreparationAnalyticsProps) {
	const guestsQuery = useGuestStats(eventId);
	const tablesQuery = useTableStats(eventId);

	const guests = guestsQuery.data;
	const tables = tablesQuery.data;

	const isLoading = guestsQuery.isLoading || tablesQuery.isLoading;
	const isError = guestsQuery.isError || tablesQuery.isError;
	const hasData =
		!!guests && (guests.totalGuests > 0 || (tables?.total ?? 0) > 0);

	const occupancyRate = tables?.occupancyRate ?? 0;

	// Without an explicit `color` each slice falls back to the chart palette
	// (`--chart-1` onwards), which is what the legend mirrors.
	const occupancyData = useMemo(
		() => [
			{ label: "Cheias", value: tables?.fullTables ?? 0 },
			{ label: "Parciais", value: tables?.partialTables ?? 0 },
			{ label: "Vazias", value: tables?.emptyTables ?? 0 },
		],
		[tables?.fullTables, tables?.partialTables, tables?.emptyTables],
	);

	// A pie of zeros produces NaN arcs, so it only renders once tables exist.
	const hasTables = (tables?.total ?? 0) > 0;

	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: !hasData,
				hasData,
			}}
		>
			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<Users className="h-4 w-4" />
							Preparação do evento
						</CardTitle>
					</CardHeader>
					<CardContent>
						<EventPreparationFunnel guests={guests} tables={tables} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-sm">
							<UtensilsCrossed className="h-4 w-4" />
							Capacidade das mesas
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{hasTables ? (
							<>
								<div className="flex justify-center">
									<PieChart data={occupancyData} innerRadius={58} size={180}>
										{occupancyData.map((slice, index) => (
											<PieSlice key={slice.label} index={index} />
										))}
										<PieCenter defaultLabel="mesas" />
									</PieChart>
								</div>

								<ChartLegend
									items={[
										{
											label: "Cheias",
											color: "var(--chart-1)",
											value: tables?.fullTables ?? 0,
										},
										{
											label: "Parciais",
											color: "var(--chart-2)",
											value: tables?.partialTables ?? 0,
										},
										{
											label: "Vazias",
											color: "var(--chart-3)",
											value: tables?.emptyTables ?? 0,
										},
									]}
								/>
							</>
						) : (
							<p className="py-8 text-center text-muted-foreground text-sm">
								Ainda não existem mesas atribuídas.
							</p>
						)}

						<div className="grid grid-cols-3 gap-2 text-center">
							<div className="border p-2">
								<p className="text-muted-foreground text-xs">Mesas</p>
								<p className="font-semibold">{tables?.total ?? 0}</p>
							</div>
							<div className="border p-2">
								<p className="text-muted-foreground text-xs">Lugares</p>
								<p className="font-semibold">{tables?.totalCapacity ?? 0}</p>
							</div>
							<div className="border p-2">
								<p className="text-muted-foreground text-xs">Taxa</p>
								<p className="font-semibold">{occupancyRate}%</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</QueryState>
	);
}
