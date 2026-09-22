import { Button } from "@muxima/ui/components/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@muxima/ui/components/card";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { StatRow } from "./stat-row";

interface ScheduleStatsCardProps {
	eventId: string;
	stats?: {
		total: number;
		pending: number;
		inProgress: number;
		completed: number;
	};
}

export function ScheduleStatsCard({
	eventId,
	stats,
}: ScheduleStatsCardProps) {
	const total = stats?.total ?? 0;

	if (total === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<Clock className="h-4 w-4" />
					Cronograma ({total} itens)
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-3">
				<StatRow
					label="Pendentes"
					value={stats?.pending ?? 0}
				/>

				<StatRow
					label="Em andamento"
					value={stats?.inProgress ?? 0}
				/>

				<StatRow
					label="Concluídas"
					value={stats?.completed ?? 0}
				/>

				<Button
					variant="ghost"
					size="sm"
					className="h-auto p-0"
					render={
						<Link
							to="/events/$eventId/schedule"
							params={{ eventId }}
						/>
					}
				>
					Ver cronograma completo <ArrowRight size={4} />
				</Button>
			</CardContent>
		</Card>
	);
}