import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Progress } from "@muxima/ui/components/progress";
import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText } from "lucide-react";
import { StatRow } from "./stat-row";

interface TasksStatsCardProps {
	eventId: string;
	stats?: {
		total: number;
		todo: number;
		inProgress: number;
		completed: number;
		completionRate: number;
	};
}

export function TasksStatsCard({ eventId, stats }: TasksStatsCardProps) {
	const total = stats?.total ?? 0;
	const todo = stats?.todo ?? 0;
	const inProgress = stats?.inProgress ?? 0;
	const completed = stats?.completed ?? 0;
	const completionRate = stats?.completionRate ?? 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-2">
						<FileText className="h-4 w-4" />
						Tarefas
					</span>

					<span className="font-normal text-muted-foreground text-xs">
						{total} total
					</span>
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-3">
				<StatRow label="Por fazer" value={todo} />
				<StatRow label="Em andamento" value={inProgress} />
				<StatRow label="Concluídas" value={completed} />

				{total > 0 && (
					<div className="pt-1">
						<div className="mb-1 flex justify-between text-xs">
							<span className="text-muted-foreground">Progresso</span>

							<span>{completionRate}%</span>
						</div>

						<Progress value={completionRate} />
					</div>
				)}

				<Button
					variant="ghost"
					size="sm"
					className="mt-1 h-auto p-0"
					render={<Link to="/events/$eventId/tasks" params={{ eventId }} />}
				>
					Ver tarefas <ArrowRight size={4} />
				</Button>
			</CardContent>
		</Card>
	);
}
