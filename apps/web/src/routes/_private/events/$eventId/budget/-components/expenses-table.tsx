import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { Pencil, Trash2 } from "lucide-react";
import { useSelected } from "@/core/hooks/useSelected";
import type { SelectedItem } from "@/core/types";
import { formatCurrency } from "@/shared/utils/format-currency";
import { ACTION_TYPES_EXPENSE } from "../-constants";
import type { ActionTypeExpense, Expense } from "../-types";
import { CATEGORY_MAP } from "../-types";
import { DeleteDialog } from "./delete-dialog";
import { ExpenseDialog } from "./expense-dialog";

interface ExpensesTableProps {
	expenses: Expense[];
	updateExpense: { mutate: (vars: any, opts: any) => void; isPending: boolean };
	deleteExpense: { mutate: (vars: any, opts: any) => void; isPending: boolean };
}

export function ExpensesTable({
	expenses,
	updateExpense,
	deleteExpense,
}: ExpensesTableProps) {
	const { isSelected, selectedAction, selectedItem, onSelect, clearSelection } =
		useSelected<SelectedItem, ActionTypeExpense>();

	return (
		<>
			<Card>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Descricao</TableHead>
							<TableHead>Fornecedor</TableHead>
							<TableHead>Valor</TableHead>
							<TableHead>Categoria</TableHead>
							<TableHead>Data</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead className="w-24" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{expenses.map((e) => (
							<TableRow key={e.id}>
								<TableCell className="font-medium">{e.description}</TableCell>
								<TableCell>{e.vendor?.name || "Sem fornecedor"}</TableCell>
								<TableCell>{formatCurrency(Number(e.totalAmount))}</TableCell>
								<TableCell>
									{CATEGORY_MAP[e.category || "OTHER"] || "Outros"}
								</TableCell>
								<TableCell>{e.expenseDate || "\u2014"}</TableCell>
								<TableCell>
									<Badge variant={e.isPaid ? "default" : "secondary"}>
										{e.isPaid ? "Pago" : "Pendente"}
									</Badge>
								</TableCell>
								<TableCell>
									<div className="flex gap-1">
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() =>
												onSelect(
													e as unknown as SelectedItem,
													ACTION_TYPES_EXPENSE.UPDATE,
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
													e as unknown as SelectedItem,
													ACTION_TYPES_EXPENSE.DELETE,
												)
											}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>

			{isSelected &&
				selectedAction === ACTION_TYPES_EXPENSE.UPDATE &&
				selectedItem && (
					<ExpenseDialog
						open={isSelected}
						onOpenChange={clearSelection}
						onSubmit={(values) => {
							updateExpense.mutate(
								{ id: (selectedItem as any).id, ...values } as never,
								{
									onSuccess: () => {
										clearSelection();
									},
									onError: (e: Error) => {},
								},
							);
						}}
						isLoading={updateExpense.isPending}
					/>
				)}

			{isSelected &&
				selectedAction === ACTION_TYPES_EXPENSE.DELETE &&
				selectedItem && (
					<DeleteDialog
						open={isSelected}
						onOpenChange={clearSelection}
						onConfirm={() => {
							deleteExpense.mutate(
								{ id: (selectedItem as any).id },
								{
									onSuccess: () => {
										clearSelection();
									},
									onError: (e: Error) => {},
								},
							);
						}}
						isLoading={deleteExpense.isPending}
					/>
				)}
		</>
	);
}
