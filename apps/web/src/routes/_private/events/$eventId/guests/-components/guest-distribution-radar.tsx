import type { GuestStats } from "@muxima/api/shared/types/entities";
import { useMemo } from "react";
import { RadarArea } from "@/components/charts/radar-area";
import { RadarAxis } from "@/components/charts/radar-axis";
import { RadarChart } from "@/components/charts/radar-chart";
import { RadarGrid } from "@/components/charts/radar-grid";
import { RadarLabels } from "@/components/charts/radar-labels";
import { GUEST_TYPE_LABELS } from "@/utils/status-helpers";

const GUEST_TYPES = ["FAMILY", "FRIEND", "COLLEAGUE", "VIP", "OTHER"] as const;

function pickByType(
	stats: GuestStats | null | undefined,
	pick: (stats: GuestStats["byType"][(typeof GUEST_TYPES)[number]]) => number,
): Record<(typeof GUEST_TYPES)[number], number> {
	const result = {} as Record<(typeof GUEST_TYPES)[number], number>;
	for (const type of GUEST_TYPES) {
		result[type] = stats ? pick(stats.byType[type]) : 0;
	}
	return result;
}

type GuestDistributionRadarProps = {
	stats?: GuestStats | null;
};

export function GuestDistributionRadar({ stats }: GuestDistributionRadarProps) {
	const { metrics, data } = useMemo(() => {
		const metrics = GUEST_TYPES.map((type) => ({
			key: type,
			label: GUEST_TYPE_LABELS[type] ?? type,
		}));

		const totals = pickByType(stats, (byType) => byType?.total ?? 0);

		const allZero =
			stats === null ||
			stats === undefined ||
			Object.values(totals).every((value) => value <= 0);
		const maxTotal = Math.max(1, ...Object.values(totals));

		const toPct = (value: number) =>
			allZero ? 0 : Math.round((value / maxTotal) * 100);

		const data = [
			{
				label: "Total",
				values: pickByType(stats, (byType) => toPct(byType?.total ?? 0)),
			},
			{
				label: "Confirmados",
				values: pickByType(stats, (byType) => toPct(byType?.confirmed ?? 0)),
			},
			{
				label: "Pendentes",
				values: pickByType(stats, (byType) => toPct(byType?.pending ?? 0)),
			},
		];

		return { metrics, data };
	}, [stats]);

	if (!stats || stats.totalGuests === 0) {
		return (
			<p className="py-12 text-center text-muted-foreground text-sm">
				Sem convidados registados para visualizar a distribuição.
			</p>
		);
	}

	return (
		<div className="mx-auto w-full max-w-sm" aria-hidden="true">
			<RadarChart data={data} metrics={metrics}>
				<RadarGrid />
				<RadarAxis />
				<RadarLabels />
				{data.map((entry, index) => (
					<RadarArea key={entry.label} index={index} />
				))}
			</RadarChart>
		</div>
	);
}
