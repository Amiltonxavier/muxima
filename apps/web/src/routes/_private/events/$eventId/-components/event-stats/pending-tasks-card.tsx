import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface PendingTasksCardProps {
	eventId: string;
	count: number;
}

export function PendingTasksCard({ eventId, count }: PendingTasksCardProps) {
	if (count <= 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-sm">
					<AlertTriangle className="h-4 w-4 text-amber-500" />
					Tarefas pendentes
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-2">
				<p className="text-muted-foreground text-sm">
					{count} tarefa{count !== 1 ? "s" : ""} por fazer
				</p>

				<Button
					variant="ghost"
					size="sm"
					className="h-auto p-0"
					render={<Link to="/events/$eventId/tasks" params={{ eventId }} />}
				>
					Gerir tarefas <ArrowRight size={4} />
				</Button>
			</CardContent>
		</Card>
	);
}
