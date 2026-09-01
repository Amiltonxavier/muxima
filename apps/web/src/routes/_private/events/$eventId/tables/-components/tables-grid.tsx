import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import { MapPin, Pencil, Trash2 } from "lucide-react";
import { useSelected } from "@/core/hooks/useSelected";
import type { SelectedItem } from "@/core/types";
import { ACTION_TYPES_TABLE } from "../-constants";
import type { ActionTypeTable, TableItem } from "../-types";
import { DeleteDialog } from "./delete-dialog";
import { ViewTableDialog } from "./view-table-dialog";

interface TablesGridProps {
	tables: TableItem[];
	updateTable: { mutate: (vars: any, opts: any) => void; isPending: boolean };
	deleteTable: { mutate: (vars: any, opts: any) => void; isPending: boolean };
}

export function TablesGrid({
	tables,
	updateTable,
	deleteTable,
}: TablesGridProps) {
	const { isSelected, selectedAction, selectedItem, onSelect, clearSelection } =
		useSelected<SelectedItem, ActionTypeTable>();

	return (
		<>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{tables.map((table) => {
					const guests = table.tableGuests || [];
					const capacity = table.capacity || 0;
					return (
						<Card
							key={table.id}
							className="cursor-pointer hover:bg-muted/50"
							onClick={() =>
								onSelect(
									table as unknown as SelectedItem,
									ACTION_TYPES_TABLE.VIEW,
								)
							}
						>
							<div className="p-4">
								<div className="flex items-center justify-between">
									<h3 className="font-semibold text-lg">{table.name}</h3>
									<div className="flex gap-1">
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={(e) => {
												e.stopPropagation();
												onSelect(
													table as unknown as SelectedItem,
													ACTION_TYPES_TABLE.UPDATE,
												);
											}}
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											className="text-destructive"
											onClick={(e) => {
												e.stopPropagation();
												onSelect(
													table as unknown as SelectedItem,
													ACTION_TYPES_TABLE.DELETE,
												);
											}}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
								<div className="mt-2 flex items-center gap-4 text-muted-foreground text-sm">
									<span>
										{guests.length}/{capacity} lugares
									</span>
									{table.location && (
										<span className="flex items-center gap-1">
											<MapPin className="h-3 w-3" />
											{table.location}
										</span>
									)}
								</div>
								<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
									<div
										className="h-full rounded-full bg-blue-500 transition-all"
										style={{
											width: `${capacity > 0 ? Math.min((guests.length / capacity) * 100, 100) : 0}%`,
										}}
									/>
								</div>
							</div>
						</Card>
					);
				})}
			</div>

			{isSelected &&
				selectedAction === ACTION_TYPES_TABLE.VIEW &&
				selectedItem && (
					<ViewTableDialog
						table={selectedItem as unknown as TableItem}
						onClose={clearSelection}
					/>
				)}

			{isSelected &&
				selectedAction === ACTION_TYPES_TABLE.UPDATE &&
				selectedItem && (
					<TableDialogInline
						open={isSelected}
						onOpenChange={clearSelection}
						initialValues={{
							name: (selectedItem as any).name || "",
							number: (selectedItem as any).number || 0,
							capacity: (selectedItem as any).capacity || 8,
							location: (selectedItem as any).location || "",
							notes: (selectedItem as any).notes || "",
						}}
						onSubmit={(values) => {
							updateTable.mutate(
								{ id: (selectedItem as any).id, ...values } as never,
								{
									onSuccess: () => {
										clearSelection();
									},
									onError: (e: Error) => {},
								},
							);
						}}
						isLoading={updateTable.isPending}
					/>
				)}

			{isSelected &&
				selectedAction === ACTION_TYPES_TABLE.DELETE &&
				selectedItem && (
					<DeleteDialog
						open={isSelected}
						onOpenChange={clearSelection}
						tableName={(selectedItem as any).name || ""}
						guestCount={(selectedItem as any).tableGuests?.length || 0}
						onConfirm={() => {
							deleteTable.mutate(
								{ id: (selectedItem as any).id },
								{
									onSuccess: () => {
										clearSelection();
									},
									onError: (e: Error) => {},
								},
							);
						}}
						isLoading={deleteTable.isPending}
					/>
				)}
		</>
	);
}

import { TableDialog } from "./table-dialog";

function TableDialogInline(props: React.ComponentProps<typeof TableDialog>) {
	return <TableDialog {...props} />;
}
