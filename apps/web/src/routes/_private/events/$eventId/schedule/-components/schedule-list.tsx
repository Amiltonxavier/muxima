import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { format } from "date-fns";
import { Clock, MapPin, Trash2 } from "lucide-react";
import { QueryState } from "@/shared/components/states";
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
	onDelete,
}: {
	schedules: ScheduleItem[];
	isLoading: boolean;
	isError: boolean;
	onDelete: (schedule: ScheduleItem) => void;
}) {
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
						className="flex items-center justify-between rounded-md border px-4 py-2"
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
							<Button
								variant="ghost"
								size="icon-sm"
								className="text-destructive"
								onClick={() => onDelete(schedule)}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				))}
			</div>
		</QueryState>
	);
}
