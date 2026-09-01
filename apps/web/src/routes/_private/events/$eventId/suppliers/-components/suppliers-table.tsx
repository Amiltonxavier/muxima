import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import { StatusBadge } from "@muxima/ui/components/kibo-ui/status";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSelected } from "@/core/hooks/useSelected";
import type { SelectedItem } from "@/core/types";
import {
	useDeleteVendor,
	useUpdateVendor,
} from "@/shared/queries/vendor-queries";
import { formatCurrency } from "@/shared/utils/format-currency";
import {
	getStatusLabel,
	VENDOR_CATEGORY_LABELS,
} from "@/shared/utils/status-helpers";
import { ACTION_TYPES_VENDOR } from "../-constants";
import type { ActionTypeVendor, Vendor } from "../-types";
import { DeleteDialog } from "./delete-dialog";
import { VendorDialog } from "./vendor-dialog";

interface SuppliersTableProps {
	vendors: Vendor[];
	eventId: string;
}

export function SuppliersTable({ vendors, eventId }: SuppliersTableProps) {
	const { isSelected, selectedAction, selectedItem, onSelect, clearSelection } =
		useSelected<SelectedItem, ActionTypeVendor>();

	const updateVendor = useUpdateVendor();
	const deleteVendor = useDeleteVendor();

	return (
		<>
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Fornecedor</TableHead>
							<TableHead>Categoria</TableHead>
							<TableHead>Contacto</TableHead>
							<TableHead>Despesas</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead className="w-24" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{vendors.map((v) => {
							const expenses = v.expenses ?? [];
							const totalExpenses = expenses.reduce(
								(sum: number, e: { id: string; totalAmount: number }) =>
									sum + Number(e.totalAmount || 0),
								0,
							);
							return (
								<TableRow key={v.id}>
									<TableCell className="font-medium">{v.name}</TableCell>
									<TableCell>
										{VENDOR_CATEGORY_LABELS[v.category] || v.category}
									</TableCell>
									<TableCell>
										<div className="text-sm">
											{v.phone && <p>{v.phone}</p>}
											{v.email && (
												<p className="text-muted-foreground text-xs">
													{v.email}
												</p>
											)}
										</div>
									</TableCell>
									<TableCell>
										{totalExpenses > 0 ? (
											<span className="font-medium text-sm">
												{expenses.length} ({formatCurrency(totalExpenses)})
											</span>
										) : (
											<span className="text-muted-foreground text-sm">
												\u2014
											</span>
										)}
									</TableCell>
									<TableCell>
										<StatusBadge
											status={(v.status as any) || "PROSPECT"}
											label={getStatusLabel(v.status || "PROSPECT", "vendor")}
										/>
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() =>
													onSelect(
														v as unknown as SelectedItem,
														ACTION_TYPES_VENDOR.UPDATE,
													)
												}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												className="text-destructive"
												onClick={() =>
													onSelect(
														v as unknown as SelectedItem,
														ACTION_TYPES_VENDOR.DELETE,
													)
												}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</Card>

			{isSelected &&
				selectedAction === ACTION_TYPES_VENDOR.UPDATE &&
				selectedItem && (
					<VendorDialog
						open={isSelected}
						onOpenChange={clearSelection}
						initialValues={{
							name: (selectedItem as any).name || "",
							category: (selectedItem as any).category || "OTHER",
							phone: (selectedItem as any).phone || "",
							email: (selectedItem as any).email || "",
							status: (selectedItem as any).status || "PROSPECT",
							notes: (selectedItem as any).notes || "",
						}}
						onSubmit={(values) => {
							updateVendor.mutate(
								{ id: (selectedItem as any).id, ...values } as never,
								{
									onSuccess: () => {
										toast.success("Fornecedor atualizado");
										clearSelection();
									},
									onError: (e) => toast.error(e.message),
								},
							);
						}}
						isLoading={updateVendor.isPending}
					/>
				)}

			{isSelected &&
				selectedAction === ACTION_TYPES_VENDOR.DELETE &&
				selectedItem && (
					<DeleteDialog
						open={isSelected}
						onOpenChange={clearSelection}
						onConfirm={() => {
							deleteVendor.mutate(
								{ id: (selectedItem as any).id },
								{
									onSuccess: () => {
										toast.success("Eliminado");
										clearSelection();
									},
									onError: (e) => toast.error(e.message),
								},
							);
						}}
						isLoading={deleteVendor.isPending}
					/>
				)}
		</>
	);
}
