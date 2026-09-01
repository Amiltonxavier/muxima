import { useDeleteInventoryItem } from "@/routes/_private/events/$eventId/inventory/-queries/inventory-queries";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";

interface DeleteDialogProps {
	open: boolean;
	onOpenChange: VoidFunction;
	eventId: string
}

export function DeleteDialog({
	open,
	onOpenChange,
	eventId
}: DeleteDialogProps) {
	const { mutateAsync, isPending } = useDeleteInventoryItem();

	const handleDelete = async () => {
		if (eventId) {
			mutateAsync({ id: eventId }).then(() => onOpenChange())
		}
	}
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Eliminar item</DialogTitle>
				</DialogHeader>
				<p className="text-muted-foreground text-sm">
					Tem certeza que deseja eliminar este item do inventário? Esta ação
					não pode ser desfeita.
				</p>
				<DialogFooter>
					<Button variant="outline" onClick={onOpenChange}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						onClick={handleDelete}
						disabled={isPending}
					>
						Eliminar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
