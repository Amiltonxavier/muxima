import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { toast } from "sonner";
import { useCreateSupplier } from "../-queries/suppliers-queries";
import { SupplierForm } from "./supplier-form";

export function SupplierCreateDialog({
	open,
	onOpenChange,
	eventId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
}) {
	const createSupplier = useCreateSupplier();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Adicionar fornecedor</DialogTitle>
					<DialogDescription>
						O montante acordado, os pagamentos e as parcelas alimentam o
						orçamento e o checklist do evento.
					</DialogDescription>
				</DialogHeader>
				<SupplierForm
					submitLabel="Adicionar"
					pendingLabel="A guardar..."
					isSubmitting={createSupplier.isPending}
					onCancel={() => onOpenChange(false)}
					onSubmit={(values) =>
						createSupplier.mutate(
							{ eventId, ...values },
							{
								onSuccess: () => {
									toast.success("Fornecedor adicionado");
									onOpenChange(false);
								},
								onError: (error) => toast.error(error.message),
							},
						)
					}
				/>
			</DialogContent>
		</Dialog>
	);
}
