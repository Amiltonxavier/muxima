import { Button } from "@muxima/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateExpense,
	useDeleteExpense,
	useExpenses,
	useUpdateExpense,
} from "@/shared/queries/budget-queries";
import { formatCurrency } from "@/shared/utils/format-currency";
import { ExpenseDialog } from "./-components/expense-dialog";
import { ExpensesTable } from "./-components/expenses-table";
import type { Expense } from "./-types";

export const Route = createFileRoute("/_private/events/$eventId/budget/")({
	component: BudgetPage,
});

function BudgetPage() {
	const { eventId } = Route.useParams();

	const expensesQuery = useExpenses(eventId);
	const createExpense = useCreateExpense();
	const updateExpense = useUpdateExpense();
	const deleteExpense = useDeleteExpense();

	const [showCreate, setShowCreate] = useState(false);

	const expenses = (expensesQuery.data?.data ?? []) as unknown as Expense[];

	const totalPaid = useMemo(
		() =>
			expenses
				.filter((e) => e.isPaid)
				.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0),
		[expenses],
	);
	const totalPending = useMemo(
		() =>
			expenses
				.filter((e) => !e.isPaid)
				.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0),
		[expenses],
	);
	const totalExpenses = totalPaid + totalPending;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Orcamento</h1>
					<p className="text-muted-foreground text-sm">
						{formatCurrency(totalExpenses)} total
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar despesa
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<div className="border p-4">
					<p className="text-muted-foreground text-sm">Total</p>
					<p className="font-semibold text-2xl">
						{formatCurrency(totalExpenses)}
					</p>
				</div>
				<div className="border p-4">
					<p className="text-muted-foreground text-sm">Pago</p>
					<p className="font-semibold text-2xl text-green-600">
						{formatCurrency(totalPaid)}
					</p>
				</div>
				<div className="border p-4">
					<p className="text-muted-foreground text-sm">Pendente</p>
					<p className="font-semibold text-2xl text-amber-600">
						{formatCurrency(totalPending)}
					</p>
				</div>
			</div>

			<QueryState
				state={{
					isLoading: expensesQuery.isLoading,
					isError: expensesQuery.isError,
					isEmpty: expenses.length === 0,
					hasData: expenses.length > 0,
				}}
			>
				<ExpensesTable
					expenses={expenses}
					updateExpense={updateExpense}
					deleteExpense={deleteExpense}
				/>
			</QueryState>

			<ExpenseDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createExpense.mutate({ ...values, eventId } as never, {
						onSuccess: () => {
							toast.success("Despesa adicionada");
							setShowCreate(false);
						},
						onError: (e) => toast.error(e.message),
					});
				}}
				isLoading={createExpense.isPending}
			/>
		</div>
	);
}
