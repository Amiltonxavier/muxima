import { PERMISSIONS } from "@muxima/permissions";
import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { format, isSameDay } from "date-fns";
import { Clock, History, MapPin, Pencil, Trash2 } from "lucide-react";
import { useEvent } from "@/routes/_private/events/-queries/event-queries";
import { QueryState } from "@/shared/components/states";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";
import {
	DEFAULT_SCHEDULE_STATUS,
	SCHEDULE_STATUS_LABELS,
	SCHEDULE_STATUS_MAP,
} from "../-constants/schedule.constants";
import type { ScheduleItem } from "../-types/schedule.types";

export function ScheduleList({
	schedules,
	isLoading,
	isError,
	onEdit,
	onChangeStatus,
	onDelete,
}: {
	schedules: ScheduleItem[];
	isLoading: boolean;
	isError: boolean;
	onEdit: (schedule: ScheduleItem) => void;
	onChangeStatus: (schedule: ScheduleItem) => void;
	onDelete: (schedule: ScheduleItem) => void;
}) {
	const { eventId, isEventLocked, lockMessage } = useEventLock();
	// Status changes are only meaningful while the event is happening: this
	// only happens on the event day (the API enforces the same rule).
	const eventQuery = useEvent(eventId ?? "");
	const isEventDay =
		!!eventQuery.data?.eventDate &&
		isSameDay(new Date(eventQuery.data.eventDate), new Date());
	// Editing an activity and changing its status are update capabilities;
	// deleting is its own capability (`schedule.delete`). Hidden without them.
	const canUpdate = useEventCan(
		eventId ?? undefined,
		PERMISSIONS.SCHEDULE_UPDATE,
	);
	const canDelete = useEventCan(
		eventId ?? undefined,
		PERMISSIONS.SCHEDULE_DELETE,
	);

	return (
		<QueryState
			state={{
				isLoading,
				isError,
				isEmpty: schedules.length === 0,
				hasData: schedules.length > 0,
			}}
		>
			<div className="space-y-1">
				{schedules.map((schedule) => (
					<div
						key={schedule.id}
						className="flex items-center justify-between border px-4 py-2"
					>
						<div className="flex items-center gap-3">
							<div
								className="h-2.5 w-2.5 rounded-full"
								style={{
									backgroundColor:
										SCHEDULE_STATUS_MAP[schedule.status]?.color ||
										DEFAULT_SCHEDULE_STATUS.color,
								}}
							/>
							<div>
								<p className="font-medium text-sm">{schedule.title}</p>
								<div className="flex items-center gap-3 text-muted-foreground text-xs">
									{schedule.startAt && (
										<span className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											{format(new Date(schedule.startAt), "dd/MM/yyyy HH:mm")}
											{schedule.endAt
												? ` — ${format(new Date(schedule.endAt), "HH:mm")}`
												: ""}
										</span>
									)}
									{schedule.location && (
										<span className="flex items-center gap-1">
											<MapPin className="h-3 w-3" />
											{schedule.location}
										</span>
									)}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="secondary">
								{SCHEDULE_STATUS_LABELS[schedule.status] ||
									SCHEDULE_STATUS_LABELS.PENDING}
							</Badge>
							{canUpdate && (
								<Button
									variant="ghost"
									size="icon-sm"
									disabled={isEventLocked}
									title={isEventLocked ? (lockMessage ?? undefined) : "Editar"}
									onClick={() => onEdit(schedule)}
								>
									<Pencil className="h-3.5 w-3.5" />
								</Button>
							)}
							{canUpdate && (
								<Button
									variant="ghost"
									size="icon-sm"
									disabled={isEventLocked || !isEventDay}
									title={
										isEventLocked
											? (lockMessage ?? undefined)
											: !isEventDay
												? "Só podes alterar o estado de atividades no dia do evento"
												: "Mudar estado"
									}
									onClick={() => onChangeStatus(schedule)}
								>
									<History className="h-3.5 w-3.5" />
								</Button>
							)}
							{canDelete && (
								<Button
									variant="ghost"
									size="icon-sm"
									className="text-destructive"
									disabled={isEventLocked}
									title={
										isEventLocked ? (lockMessage ?? undefined) : "Eliminar"
									}
									onClick={() => onDelete(schedule)}
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							)}
						</div>
					</div>
				))}
			</div>
		</QueryState>
	);
}
