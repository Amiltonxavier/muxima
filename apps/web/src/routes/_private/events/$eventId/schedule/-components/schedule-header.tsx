import { Button } from "@muxima/ui/components/button";
import { ExportMenu } from "@/shared/components/export-menu";
import { Plus } from "lucide-react";

export function ScheduleHeader({
	eventId,
	activityCount,
	onAddActivity,
}: {
	eventId: string;
	activityCount: number;
	onAddActivity: () => void;
	
}) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="font-semibold text-2xl">Cronograma</h1>
				<p className="text-muted-foreground text-sm">
					{activityCount} atividade{activityCount !== 1 ? "s" : ""}
				</p>
			</div>
			<div className="flex gap-2">
				<ExportMenu eventId={eventId} module="schedule" />

				<Button onClick={onAddActivity}>
				<Plus className="mr-2 h-4 w-4" />
				Adicionar atividade
			</Button>
			</div>
		</div>
	);
}
