import type { GuestStats, TableStats } from "@muxima/api/shared/types/entities";
import { useMemo } from "react";
import {
	FunnelChart,
	type FunnelStage,
} from "@/components/charts/funnel-chart";

type EventPreparationFunnelProps = {
	guests?: GuestStats | null;
	tables?: TableStats | null;
};

export function EventPreparationFunnel({
	guests,
	tables,
}: EventPreparationFunnelProps) {
	const stages = useMemo<FunnelStage[]>(() => {
		const planned = guests?.totalGuests ?? 0;
		const confirmed = guests?.totalConfirmedPeople ?? 0;
		const seated = tables?.totalOccupied ?? 0;

		return [
			{ label: "Convidados planeados", value: planned },
			{ label: "Confirmados", value: confirmed },
			{ label: "Com mesa atribuída", value: seated },
		];
	}, [guests, tables]);

	if (!guests && !tables) {
		return (
			<p className="py-12 text-center text-muted-foreground text-sm">
				Sem dados de preparação disponíveis.
			</p>
		);
	}

	return (
		<FunnelChart
			data={stages}
			showValues
			showLabels
			showPercentage
			formatValue={(value) => String(value)}
		/>
	);
}
