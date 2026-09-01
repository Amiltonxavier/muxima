import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { format } from "date-fns";
import { Clock, MapPin, Trash2 } from "lucide-react";
import { useSelected } from "@/core/hooks/useSelected";
import type { SelectedItem } from "@/core/types";
import {
	ACTION_TYPES_SCHEDULE,
	STATUS_LABELS,
	STATUS_MAP,
} from "../-constants";
import type { ActionTypeSchedule, Schedule } from "../-types";
import { DeleteDialog } from "./delete-dialog";

interface ScheduleListProps {
	schedules: Schedule[];
	deleteSchedule: {
		mutate: (vars: any, opts: any) => void;
		isPending: boolean;
	};
}

export function ScheduleList({ schedules, deleteSchedule }: ScheduleListProps) {
	const { isSelected, selectedAction, selectedItem, onSelect, clearSelection } =
		useSelected<SelectedItem, ActionTypeSchedule>();

	return (
		<>
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
										STATUS_MAP[schedule.status || "PENDING"]?.color ||
										"#eab308",
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
												? ` \u2014 ${format(new Date(schedule.endAt), "HH:mm")}`
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
								{STATUS_LABELS[schedule.status || "PENDING"] || "Pendente"}
							</Badge>
							<Button
								variant="ghost"
								size="icon-sm"
								className="text-destructive"
								onClick={() =>
									onSelect(
										schedule as unknown as SelectedItem,
										ACTION_TYPES_SCHEDULE.DELETE,
									)
								}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				))}
			</div>

			{isSelected &&
				selectedAction === ACTION_TYPES_SCHEDULE.DELETE &&
				selectedItem && (
					<DeleteDialog
						open={isSelected}
						onOpenChange={clearSelection}
						onConfirm={() => {
							deleteSchedule.mutate(
								{ id: (selectedItem as any).id },
								{
									onSuccess: () => {
										clearSelection();
									},
									onError: (e: Error) => {},
								},
							);
						}}
						isLoading={deleteSchedule.isPending}
					/>
				)}
		</>
	);
}
