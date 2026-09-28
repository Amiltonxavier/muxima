import type { GuestStats } from "@muxima/api/shared/types/entities";
import { StatsGrid } from "@/shared/components/metrics";
import { StatsCard } from "@/shared/components/stats-card/stats-card";

export function GuestsStats({ stats }: { stats?: GuestStats | null }) {
	if (!stats) {
		return null;
	}

	return (
		<StatsGrid columns={3}>
			<StatsCard title="Total" value={stats.totalGuests} />
			<StatsCard title="Confirmados" value={stats.confirmed} />
			<StatsCard title="Pendentes" value={stats.pending} />
			<StatsCard title="Talvez" value={stats.maybe} />
			<StatsCard title="Recusados" value={stats.declined} />
			<StatsCard title="Acompanhantes" value={stats.totalCompanions} />
		</StatsGrid>
	);
}
