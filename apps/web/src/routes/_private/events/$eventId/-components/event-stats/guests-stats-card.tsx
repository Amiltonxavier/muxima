// event-stats/components/guests-stats-card.tsx

import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Progress } from "@muxima/ui/components/progress";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Users } from "lucide-react";
import { StatRow } from "./stat-row";

type GuestsStats = {
	totalGuests: number;
	confirmed: number;
	pending: number;
	confirmationRate: number;
};

interface GuestsStatsCardProps {
	eventId: string;
	stats?: GuestsStats;
}

export function GuestsStatsCard({ eventId, stats }: GuestsStatsCardProps) {
	const totalGuests = stats?.totalGuests ?? 0;
	const confirmed = stats?.confirmed ?? 0;
	const pending = stats?.pending ?? 0;
	const confirmationRate = stats?.confirmationRate ?? 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-2">
						<Users className="h-4 w-4" />
						Convidados
					</span>

					<span className="font-normal text-muted-foreground text-xs">
						{totalGuests} total
					</span>
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-3">
				<StatRow label="Confirmados" value={confirmed} />
				<StatRow label="Pendentes" value={pending} />

				{totalGuests > 0 && (
					<div className="pt-1">
						<div className="mb-1 flex justify-between text-xs">
							<span className="text-muted-foreground">Confirmação</span>

							<span>{confirmationRate}%</span>
						</div>

						<Progress value={confirmationRate} />
					</div>
				)}

				<Button
					variant="ghost"
					size="sm"
					className="mt-1 h-auto p-0"
					render={<Link to="/events/$eventId/guests" params={{ eventId }} />}
				>
					Ver convidados <ArrowRight size={4} />
				</Button>
			</CardContent>
		</Card>
	);
}
