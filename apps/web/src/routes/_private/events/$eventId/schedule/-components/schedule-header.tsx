import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";

export function ScheduleHeader({
	activityCount,
	onAddActivity,
}: {
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
			<Button onClick={onAddActivity}>
				<Plus className="mr-2 h-4 w-4" />
				Adicionar atividade
			</Button>
		</div>
	);
}
