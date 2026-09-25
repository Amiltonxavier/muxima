import type { GuestStats } from "@muxima/api/shared/types/entities";
import { StatsCard } from "@/shared/components/stats-card/stats-card";

export function GuestsStats({ stats }: { stats?: GuestStats | null }) {
	if (!stats) {
		return null;
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<StatsCard title="Total" value={stats.totalGuests} />
			<StatsCard title="Confirmados" value={stats.confirmed} />
			<StatsCard title="Pendentes" value={stats.pending} />
			<StatsCard title="Talvez" value={stats.maybe} />
			<StatsCard title="Recusados" value={stats.declined} />
			<StatsCard title="Acompanhantes" value={stats.totalCompanions} />
		</div>
	);
}
