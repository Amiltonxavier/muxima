import type { InvitationStats } from "@muxima/api/shared/types/entities";
import { StatsGrid } from "@/shared/components/metrics";
import { StatsCard } from "@/shared/components/stats-card/stats-card";

export function InvitationsStats({
	stats,
	isLoading,
}: {
	stats?: InvitationStats | null;
	isLoading?: boolean;
}) {
	if (isLoading || !stats) {
		return null;
	}

	return (
		<StatsGrid columns={4}>
			<StatsCard
				title="Total de convites"
				value={stats.total}
				description={`${stats.published} publicados`}
			/>
			<StatsCard title="Respondidos" value={stats.responded} />
			<StatsCard
				title="Sem resposta"
				value={Math.max(stats.published - stats.responded, 0)}
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
		</StatsGrid>
	);
}
