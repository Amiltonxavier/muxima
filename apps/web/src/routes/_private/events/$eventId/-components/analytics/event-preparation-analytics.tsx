import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Users, UtensilsCrossed } from "lucide-react";
import { ProgressDonut } from "@/shared/components/charts";
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
					<CardContent className="space-y-2">
						<div className="flex justify-center">
							<ProgressDonut
								value={tables?.totalOccupied ?? 0}
								max={tables?.totalCapacity ?? 0}
								color="#10b981"
								size={140}
								centerLabel="ocupação"
							/>
						</div>

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
