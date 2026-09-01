import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { useDeleteEvent } from "../-queries/event-queries";
import { Button } from "@muxima/ui/components/button";
import { toast } from "sonner";

interface DeleteEventDialogProps {
	open: boolean;
	onOpenChange: VoidFunction;
	eventId: string;
}

export function DeleteEventDialog({
	onOpenChange,
	open,
	eventId,
}: DeleteEventDialogProps) {
	const deleteEvent = useDeleteEvent();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Eliminar evento</DialogTitle>
					<DialogDescription>
						Tem a certeza que deseja eliminar este evento? Esta ação não pode
						ser desfeita.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={onOpenChange}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							deleteEvent.mutate(
								{ id: eventId },
								{
									onSuccess: () => {
										toast.success("Evento eliminado");
										onOpenChange();
									},
									onError: (error) => {
										toast.error(error.message);
									},
								},
							);
						}}
						disabled={deleteEvent.isPending}
					>
						Eliminar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
