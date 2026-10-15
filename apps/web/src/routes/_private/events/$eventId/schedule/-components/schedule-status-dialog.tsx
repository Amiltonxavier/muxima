import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Label } from "@muxima/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { toast } from "sonner";
import { StatusDot } from "@/shared/components/status-dot";
import { getStatusTone, toSelectItems } from "@/utils/status-helpers";
import { SCHEDULE_STATUS_LABELS } from "../-constants/schedule.constants";
import { useUpdateSchedule } from "../-queries/schedule-queries";
import type {
	ScheduleItem,
	ScheduleStatusValue,
} from "../-types/schedule.types";

const STATUS_OPTIONS = toSelectItems(SCHEDULE_STATUS_LABELS);

/**
 * "Mudar estado" action. Shows the current status and lets the user pick a
 * new one; the change is applied immediately through `updateSchedule`.
 */
export function ScheduleStatusDialog({
	schedule,
	onOpenChange,
}: {
	schedule: ScheduleItem | null;
	onOpenChange: (open: boolean) => void;
}) {
	const updateSchedule = useUpdateSchedule();
	const open = !!schedule;
	const currentStatus = schedule?.status ?? "PENDING";

	const handleSubmit = (next: ScheduleStatusValue) => {
		if (!schedule) return;
		updateSchedule.mutate(
			{ id: schedule.id, status: next },
			{
				onSuccess: () => {
					toast.success(
						`Estado alterado para "${SCHEDULE_STATUS_LABELS[next] ?? next}"`,
					);
					onOpenChange(false);
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Mudar estado</DialogTitle>
					<DialogDescription>{schedule?.title ?? ""}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex items-center justify-between rounded-md border p-3">
						<span className="text-muted-foreground text-sm">Estado actual</span>
						<StatusDot
							label={SCHEDULE_STATUS_LABELS[currentStatus] ?? currentStatus}
							tone={getStatusTone(currentStatus)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="schedule-status-next">Novo estado</Label>
						<Select
							items={STATUS_OPTIONS}
							value={currentStatus}
							onValueChange={(v) => handleSubmit(v as ScheduleStatusValue)}
						>
							<SelectTrigger id="schedule-status-next">
								<SelectValue placeholder="Escolher..." />
							</SelectTrigger>
							<SelectContent>
								{STATUS_OPTIONS.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-xs">
							Escolher um novo estado aplica a alteração imediatamente.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
