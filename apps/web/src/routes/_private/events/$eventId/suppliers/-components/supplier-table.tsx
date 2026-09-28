import { Card } from "@muxima/ui/components/card";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { EmptyState } from "@/shared/components/states/empty-state";
import { ErrorState } from "@/shared/components/states/error-state";
import { LoadingState } from "@/shared/components/states/loading-state";
import type { SupplierListItem } from "../-queries/suppliers-queries";
import { SupplierTableRow } from "./supplier-table-row";

export function SupplierTable({
	suppliers,
	isLoading,
	isError,
	hasActiveFilters,
	onView,
	onAddPayment,
	onManageInstallments,
	onChangeStatus,
	onEdit,
	onDelete,
}: {
	suppliers: SupplierListItem[];
	isLoading: boolean;
	isError: boolean;
	hasActiveFilters: boolean;
	onView: (supplier: SupplierListItem) => void;
	onAddPayment: (supplier: SupplierListItem) => void;
	onManageInstallments: (supplier: SupplierListItem) => void;
	onChangeStatus: (supplier: SupplierListItem) => void;
	onEdit: (supplier: SupplierListItem) => void;
	onDelete: (supplier: SupplierListItem) => void;
}) {
	if (isLoading) {
		return <LoadingState />;
	}

	if (isError) {
		return (
			<ErrorState message="Não foi possível carregar os fornecedores. Tente novamente." />
		);
	}

	if (suppliers.length === 0) {
		return (
			<EmptyState
				message={
					hasActiveFilters
						? "Nenhum resultado para os filtros aplicados."
						: "Ainda não existem fornecedores."
				}
			/>
		);
	}

	return (
		<Card>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Fornecedor</TableHead>
						<TableHead>Categoria</TableHead>
						<TableHead className="text-right">Montante acordado</TableHead>
						<TableHead className="text-right">Montante em falta</TableHead>
						<TableHead className="w-44">Pagamento</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead className="w-44" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{suppliers.map((supplier) => (
						<SupplierTableRow
							key={supplier.id}
							supplier={supplier}
							onView={onView}
							onAddPayment={onAddPayment}
							onManageInstallments={onManageInstallments}
							onChangeStatus={onChangeStatus}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</TableBody>
			</Table>
		</Card>
	);
}
