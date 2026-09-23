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
import { useDeleteInventoryItem } from "../-queries/inventory-queries";
import type { InventoryItem } from "../-types/inventory.types";

export function InventoryDeleteDialog({
	open,
	onOpenChange,
	item,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: InventoryItem;
}) {
	const deleteItem = useDeleteInventoryItem();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Eliminar item</DialogTitle>
					<DialogDescription>
						Tem a certeza que deseja eliminar <strong>{item.name}</strong> e o
						seu histórico de movimentos? Esta acção não pode ser desfeita.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						disabled={deleteItem.isPending}
						onClick={() =>
							deleteItem.mutate(
								{ id: item.id },
								{
									onSuccess: () => {
										toast.success("Item eliminado");
										onOpenChange(false);
									},
									onError: (error) => toast.error(error.message),
								},
							)
						}
					>
						{deleteItem.isPending ? "A eliminar..." : "Eliminar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
