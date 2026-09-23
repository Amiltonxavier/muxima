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
import type { InventoryItem } from "../-types/inventory.types";
import { InventoryTableRow } from "./inventory-table-row";

export function InventoryTable({
	items,
	isLoading,
	isError,
	hasActiveFilters,
	onViewItem,
	onEditItem,
	onAddQuantity,
	onViewHistory,
	onDeleteItem,
}: {
	items: InventoryItem[];
	isLoading: boolean;
	isError: boolean;
	hasActiveFilters: boolean;
	onViewItem: (item: InventoryItem) => void;
	onEditItem: (item: InventoryItem) => void;
	onAddQuantity: (item: InventoryItem) => void;
	onViewHistory: (item: InventoryItem) => void;
	onDeleteItem: (item: InventoryItem) => void;
}) {
	if (isLoading) {
		return <LoadingState />;
	}

	if (isError) {
		return (
			<ErrorState message="Não foi possível carregar o inventário. Tente novamente." />
		);
	}

	if (items.length === 0) {
		return (
			<EmptyState
				message={
					hasActiveFilters
						? "Nenhum resultado para os filtros aplicados."
						: "Ainda não existem itens no inventário."
				}
			/>
		);
	}

	return (
		<Card>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Produto</TableHead>
						<TableHead>Categoria</TableHead>
						<TableHead>Unidade</TableHead>
						<TableHead>Planeado</TableHead>
						<TableHead>Salão</TableHead>
						<TableHead>Actual</TableHead>
						<TableHead>Em falta</TableHead>
						<TableHead>Valor</TableHead>
						<TableHead>Progresso</TableHead>
						<TableHead className="w-44" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map((item) => (
						<InventoryTableRow
							key={item.id}
							item={item}
							onViewItem={onViewItem}
							onEditItem={onEditItem}
							onAddQuantity={onAddQuantity}
							onViewHistory={onViewHistory}
							onDeleteItem={onDeleteItem}
						/>
					))}
				</TableBody>
			</Table>
		</Card>
	);
}
