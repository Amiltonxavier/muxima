import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { toast } from "sonner";
import { useDeleteSchedule } from "../-queries/schedule-queries";
import type { ScheduleItem } from "../-types/schedule.types";

export function ScheduleDeleteDialog({
	schedule,
	onOpenChange,
}: {
	schedule: ScheduleItem | null;
	onOpenChange: (open: boolean) => void;
}) {
	const deleteSchedule = useDeleteSchedule();
	const open = !!schedule;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Eliminar atividade</DialogTitle>
					<DialogDescription>
						Tem a certeza que deseja eliminar <strong>{schedule?.title}</strong>{" "}
						do cronograma? Esta ação não pode ser desfeita.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						disabled={deleteSchedule.isPending}
						onClick={() => {
							if (!schedule) return;
							deleteSchedule.mutate(
								{ id: schedule.id },
								{
									onSuccess: () => {
										toast.success("Atividade eliminada");
										onOpenChange(false);
									},
									onError: (error) => toast.error(error.message),
								},
							);
						}}
					>
						{deleteSchedule.isPending ? "A eliminar..." : "Eliminar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
