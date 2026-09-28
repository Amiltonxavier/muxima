import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { toast } from "sonner";
import type {
	SupplierCategoryValue,
	SupplierListItem,
	SupplierStatusValue,
} from "../-queries/suppliers-queries";
import { useUpdateSupplier } from "../-queries/suppliers-queries";
import type { SupplierFormValues } from "../-types/suppliers.types";
import { SupplierForm } from "./supplier-form";

/** Maps a list row into the values the form is seeded with. */
function toFormValues(supplier: SupplierListItem): SupplierFormValues {
	return {
		name: supplier.name,
		category: supplier.category as SupplierCategoryValue,
		price: Number(supplier.price ?? 0),
		phone: supplier.phone ?? "",
		email: supplier.email ?? "",
		address: supplier.address ?? "",
		nif: supplier.nif ?? "",
		iban: supplier.iban ?? "",
		hasMcxExpress: supplier.hasMcxExpress ?? false,
		mcxPhone: supplier.mcxPhone ?? "",
		description: supplier.description ?? "",
		notes: supplier.notes ?? "",
		status: supplier.status as SupplierStatusValue,
	};
}

export function SupplierEditDialog({
	open,
	onOpenChange,
	supplier,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	supplier: SupplierListItem;
}) {
	const updateSupplier = useUpdateSupplier();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Editar fornecedor</DialogTitle>
					<DialogDescription>
						O montante acordado, os pagamentos e as parcelas alimentam o
						orçamento e o checklist do evento.
					</DialogDescription>
				</DialogHeader>
				<SupplierForm
					initialValues={toFormValues(supplier)}
					showStatusField={false}
					submitLabel="Guardar"
					isSubmitting={updateSupplier.isPending}
					onCancel={() => onOpenChange(false)}
					onSubmit={({ status: _status, ...values }) =>
						// Status is not updatable here: the API only accepts it via
						// `changeStatus`, and the edit dialog hides the field.
						updateSupplier.mutate(
							{ id: supplier.id, ...values },
							{
								onSuccess: () => {
									toast.success("Fornecedor actualizado");
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
