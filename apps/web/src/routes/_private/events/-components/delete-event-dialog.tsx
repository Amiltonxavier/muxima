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
import { useDeleteEvent } from "../-queries/event-queries";

/**
 * The only delete path in the list. It owns the mutation and the toasts, so the
 * page just holds the id of the row being deleted.
 */
export function DeleteEventDialog({
	eventId,
	onOpenChange,
}: {
	eventId: string | null;
	onOpenChange: (open: boolean) => void;
}) {
	const deleteEvent = useDeleteEvent();

	function handleDelete() {
		if (!eventId) return;

		deleteEvent.mutate(
			{ id: eventId },
			{
				onSuccess: () => {
					toast.success("Evento eliminado");
					onOpenChange(false);
				},
				onError: (error) => toast.error(error.message),
			},
		);
	}

	return (
		<Dialog open={!!eventId} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Eliminar evento</DialogTitle>
					<DialogDescription>
						Tem a certeza que deseja eliminar este evento? Esta ação não pode
						ser desfeita.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={deleteEvent.isPending}
					>
						{deleteEvent.isPending ? "A eliminar..." : "Eliminar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
