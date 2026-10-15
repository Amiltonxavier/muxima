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
import {
	type ChecklistItem,
	useDeleteChecklistItem,
} from "../-queries/checklist-queries";

/**
 * Confirmação de eliminação. Detém a mutação de eliminação e o toast, de modo
 * a que a página só controle qual o item pendente.
 */
export function ConfirmDeleteDialog({
	open,
	onOpenChange,
	eventId,
	item,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	item: ChecklistItem | null;
}) {
	const deleteItem = useDeleteChecklistItem();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Eliminar item</DialogTitle>
					<DialogDescription>
						Tem a certeza de que pretende eliminar "{item?.title ?? ""}"? Esta
						ação não pode ser revertida.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						disabled={deleteItem.isPending}
						onClick={() => {
							if (!item) return;
							deleteItem.mutate(
								{ id: item.id, eventId },
								{
									onSuccess: () => {
										toast.success("Item eliminado");
										onOpenChange(false);
									},
								},
							);
						}}
					>
						{deleteItem.isPending ? "A eliminar..." : "Eliminar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
