import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { LoadingState } from "@/shared/components/states/loading-state";
import { useSupplier } from "../-queries/suppliers-queries";
import { SupplierInstallmentsDialog } from "./supplier-installments-dialog";

/**
 * Opens the installment plan directly from a table row. Saving replaces the
 * whole schedule, so the current plan is loaded with `useSupplier` before the
 * editable dialog is mounted.
 */
export function SupplierInstallmentsLoaderDialog({
	open,
	onOpenChange,
	supplierId,
	status,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	supplierId: string;
	/** Estado do fornecedor, espelhado da row da tabela. */
	status?: string;
}) {
	const supplierQuery = useSupplier(supplierId);
	const supplier = supplierQuery.data;

	if (!supplier) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Plano de parcelas</DialogTitle>
						<DialogDescription>A carregar o plano actual...</DialogDescription>
					</DialogHeader>
					<LoadingState />
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<SupplierInstallmentsDialog
			open={open}
			onOpenChange={onOpenChange}
			supplierId={supplierId}
			price={supplier.money.total}
			status={status ?? supplier.status}
			installments={supplier.installments.map((installment) => ({
				amount: installment.amount,
				dueDate: installment.dueDate,
				notes: installment.notes ?? undefined,
			}))}
		/>
	);
}
