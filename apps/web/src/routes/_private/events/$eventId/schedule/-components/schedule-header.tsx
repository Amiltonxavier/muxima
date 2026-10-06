import { PERMISSIONS } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";
import { ExportMenu } from "@/shared/components/export-menu";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";

export function ScheduleHeader({
	eventId,
	activityCount,
	onAddActivity,
}: {
	eventId: string;
	activityCount: number;
	onAddActivity: () => void;
}) {
	const { isEventLocked, lockMessage } = useEventLock();
	// Hidden without `schedule.create` — the backend rejects the same mutation.
	const canCreate = useEventCan(eventId, PERMISSIONS.SCHEDULE_CREATE);

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

				{canCreate && (
					<Button
						onClick={onAddActivity}
						disabled={isEventLocked}
						title={lockMessage ?? undefined}
					>
						<Plus className="mr-2 h-4 w-4" />
						Adicionar atividade
					</Button>
				)}
			</div>
		</div>
	);
}
