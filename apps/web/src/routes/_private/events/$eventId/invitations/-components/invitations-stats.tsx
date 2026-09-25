import type { InvitationStats } from "@muxima/api/shared/types/entities";
import { StatsCard } from "@/shared/components/stats-card/stats-card";

export function InvitationsStats({
	stats,
}: {
	stats?: InvitationStats | null;
}) {
	if (!stats) {
		return null;
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<StatsCard
				title="Total de convites"
				value={stats.total}
				description={`${stats.published} publicados`}
			/>
			<StatsCard title="Respondidos" value={stats.responded} />
			<StatsCard
				title="Sem resposta"
				value={stats.published - stats.responded}
				description={`de ${stats.published} publicados`}
			/>
			<StatsCard title="Taxa de resposta" value={`${stats.responseRate}%`} />
			<StatsCard title="Confirmados" value={stats.responses.CONFIRM} />
			<StatsCard title="Talvez" value={stats.responses.MAYBE} />
			<StatsCard title="Recusados" value={stats.responses.DECLINE} />
			<StatsCard
				title="Expirados / cancelados"
				value={stats.expired + stats.cancelled}
				description={`${stats.cancelled} cancelados`}
			/>
		</div>
	);
}
