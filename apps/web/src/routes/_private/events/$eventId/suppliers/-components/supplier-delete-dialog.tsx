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
import type { SupplierListItem } from "../-queries/suppliers-queries";
import { useDeleteSupplier } from "../-queries/suppliers-queries";

export function SupplierDeleteDialog({
	open,
	onOpenChange,
	supplier,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	supplier: SupplierListItem;
}) {
	const deleteSupplier = useDeleteSupplier();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Eliminar fornecedor</DialogTitle>
					<DialogDescription>
						Os pagamentos, parcelas, documentos e itens de checklist ligados a{" "}
						<strong>{supplier.name}</strong> serão eliminados. Esta acção não
						pode ser desfeita.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						disabled={deleteSupplier.isPending}
						onClick={() =>
							deleteSupplier.mutate(
								{ id: supplier.id },
								{
									onSuccess: () => {
										toast.success("Fornecedor eliminado");
										onOpenChange(false);
									},
									onError: (error) => toast.error(error.message),
								},
							)
						}
					>
						{deleteSupplier.isPending ? "A eliminar..." : "Eliminar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
