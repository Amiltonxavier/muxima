import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { Pagination } from "@muxima/ui/components/pagination";
import { Progress } from "@muxima/ui/components/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { CurrencyInput } from "@/shared/components/currency-input";
import { QueryState } from "@/shared/components/states";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import {
	useBudget,
	useCreateExpense,
	useDeleteExpense,
	useExpenseStats,
	useExpenses,
	useUpdateExpense,
	useUpsertBudget,
} from "@/shared/queries/budget-queries";
import { useVendors } from "@/shared/queries/vendor-queries";
import { expenseSchema } from "@/utils/budget-schemas";
import { orpc } from "@/utils/orpc";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import {
	EXPENSE_STATUS_LABELS,
	getStatusColor,
	getStatusLabel,
	toSelectItems,
} from "@/utils/status-helpers";

export const Route = createFileRoute("/_private/events/$eventId/budget/")({
	component: BudgetPage,
});

function BudgetPage() {
	const { eventId } = Route.useParams();

	const [expensePage, setExpensePage] = useState(1);
	const [expenseLimit, setExpenseLimit] = useState(20);

	const budgetQuery = useBudget(eventId);
	const expensesQuery = useExpenses(eventId, {
		page: expensePage,
		limit: expenseLimit,
	});
	const vendorsQuery = useVendors(eventId, { page: 1, limit: 50 });
	const budgetStatsQuery = useQuery(
		orpc.budget.getStats.queryOptions({ input: { eventId } }),
	);
	const createExpense = useCreateExpense();
	const updateExpense = useUpdateExpense();
	const deleteExpense = useDeleteExpense();
	const upsertBudget = useUpsertBudget();

	const vendors = vendorsQuery.data?.data ?? [];

	const [showCreateExpenseDialog, setShowCreateExpenseDialog] = useState(false);
	const [showEditBudgetDialog, setShowEditBudgetDialog] = useState(false);
	const [editingExpense, setEditingExpense] = useState<{
		id?: string;
		description?: string;
		vendorId?: string;
		totalAmount?: number;
		dueDate?: string;
		notes?: string;
		status?: string;
		vendor?: { name?: string };
	} | null>(null);
	const [viewingExpense, setViewingExpense] = useState<{
		id?: string;
		description?: string;
		vendorId?: string;
		totalAmount?: number;
		dueDate?: string;
		notes?: string;
		status?: string;
		vendor?: { name?: string; phone?: string };
		payments?: Array<{
			amount?: number;
			paymentDate?: string;
			method?: string;
		}>;
		budgetCategory?: { name?: string };
	} | null>(null);
	const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
		null,
	);

	const budget = budgetQuery.data;
	const expenses = expensesQuery.data?.data ?? [];
	const expensesMeta = expensesQuery.data?.meta;
	const budgetStats = budgetStatsQuery.data;

	const plannedAmount = budgetStats?.plannedAmount ?? Number(budget?.plannedAmount ?? 0);
	const totalExpenses = budgetStats?.totalSpent ?? 0;
	const remaining = budgetStats?.available ?? 0;
	const percent = budgetStats?.utilizationRate ?? 0;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Orçamento</h1>
					{budget && (
						<p className="text-muted-foreground text-sm">
							{budget.notes ? budget.notes : "Orçamento definido"}
						</p>
					)}
				</div>
				<div className="flex gap-2">
					{budget && (
						<Button
							variant="outline"
							onClick={() => setShowEditBudgetDialog(true)}
						>
							<Pencil className="mr-2 h-4 w-4" />
							Editar orçamento
						</Button>
					)}
					<Button onClick={() => setShowCreateExpenseDialog(true)}>
						<Plus className="mr-2 h-4 w-4" />
						Adicionar despesa
					</Button>
				</div>
			</div>

			{budgetQuery.isLoading ? (
				<div className="grid gap-4 sm:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Card key={`skeleton-${i}`}>
							<CardHeader>
								<div className="h-4 w-20 animate-pulse rounded bg-muted" />
							</CardHeader>
							<CardContent>
								<div className="h-8 w-28 animate-pulse rounded bg-muted" />
							</CardContent>
						</Card>
					))}
				</div>
			) : (			<div className="grid gap-4 sm:grid-cols-3">
				<StatsCard
					title="Planeado"
					value={formatCurrency(plannedAmount)}
					description={(budgetStats?.reserveAmount ?? 0) > 0 ? `Reserva: ${formatCurrency(budgetStats?.reserveAmount ?? 0)}` : undefined}
				/>
				<StatsCard
					title="Gasto"
					value={<span className="text-amber-600">{formatCurrency(totalExpenses)}</span>}
				/>
				<StatsCard
					title="Disponível"
					value={<span className={remaining < 0 ? "text-red-600" : "text-green-600"}>{formatCurrency(remaining > 0 ? remaining : 0)}</span>}
				/>
			</div>
			)}

			<QueryState
				state={{
					isLoading: expensesQuery.isLoading,
					isError: expensesQuery.isError,
					isEmpty: expenses.length === 0,
					hasData: expenses.length > 0,
				}}
			>
				<Card>
					<Table>
						{" "}
						<TableHeader>
							<TableRow>
								<TableHead>Descrição</TableHead>
								<TableHead>Fornecedor</TableHead>
								<TableHead>Valor</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead>Data</TableHead>
								<TableHead className="w-24" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{expenses.map((expense) => (
								<TableRow key={expense.id}>
									<TableCell className="font-medium">
										{expense.description}
									</TableCell>
									<TableCell>{expense.vendor?.name || "—"}</TableCell>
									<TableCell>
										{formatCurrency(Number(expense.totalAmount))}
									</TableCell>
									<TableCell>
										<Badge
											className={getStatusColor(expense.status || "PLANNED")}
										>
											{getStatusLabel(expense.status || "PLANNED", "expense")}
										</Badge>
									</TableCell>
									<TableCell>
										{expense.dueDate ? formatDate(expense.dueDate) : "—"}
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												title="Ver detalhes"
												onClick={() => setViewingExpense(expense)}
											>
												<Eye className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												title="Editar"
												onClick={() => setEditingExpense(expense)}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												className="text-destructive"
												title="Eliminar"
												onClick={() => setDeletingExpenseId(expense.id)}
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
			</QueryState>

			{expensesMeta && (
				<Pagination
					meta={expensesMeta}
					onPageChange={setExpensePage}
					onLimitChange={(l) => {
						setExpenseLimit(l);
						setExpensePage(1);
					}}
					disabled={expensesQuery.isLoading}
				/>
			)}

			{/* Edit Budget Dialog */}
			<BudgetDialog
				open={showEditBudgetDialog}
				onOpenChange={setShowEditBudgetDialog}
				initialValues={
					budget
						? {
								plannedAmount: Number(budget.plannedAmount ?? 0),
								reserveAmount: Number(budget.reserveAmount ?? 0),
								notes: budget.notes ?? "",
							}
						: undefined
				}
				onSubmit={(values) => {
					upsertBudget.mutate(
						{ ...values, eventId },
						{
							onSuccess: () => {
								toast.success("Orçamento atualizado");
								setShowEditBudgetDialog(false);
							},
							onError: (e) => toast.error(e.message),
						},
					);
				}}
				isLoading={upsertBudget.isPending}
			/>

			{/* Create Expense Dialog */}
			<ExpenseDialog
				open={showCreateExpenseDialog}
				onOpenChange={setShowCreateExpenseDialog}
				vendors={vendors}
				onSubmit={(values) => {
					createExpense.mutate(
						{ ...values, eventId },
						{
							onSuccess: () => {
								toast.success("Despesa adicionada");
								setShowCreateExpenseDialog(false);
							},
							onError: (e) => toast.error(e.message),
						},
					);
				}}
				isLoading={createExpense.isPending}
			/>

			{/* Edit Expense Dialog */}
			{editingExpense && (
				<ExpenseDialog
					open={!!editingExpense}
					onOpenChange={() => setEditingExpense(null)}
					vendors={vendors}
					initialValues={{
						description: editingExpense.description ?? "",
						vendorId: editingExpense.vendorId || null,
						totalAmount: Number(editingExpense.totalAmount ?? 0),
						dueDate: editingExpense.dueDate
							? new Date(editingExpense.dueDate).toISOString().split("T")[0]
							: "",
						notes: editingExpense.notes ?? "",
						status: editingExpense.status ?? "PLANNED",
					}}
					onSubmit={(values) => {
						updateExpense.mutate(
							{ id: editingExpense.id!, ...values },
							{
								onSuccess: () => {
									toast.success("Despesa atualizada");
									setEditingExpense(null);
								},
								onError: (e) => toast.error(e.message),
							},
						);
					}}
					isLoading={updateExpense.isPending}
				/>
			)}

			{/* View Expense Dialog */}
			{viewingExpense && (
				<ViewExpenseDialog
					expense={viewingExpense}
					onClose={() => setViewingExpense(null)}
				/>
			)}

			{/* Delete Expense Confirmation */}
			<Dialog
				open={!!deletingExpenseId}
				onOpenChange={() => setDeletingExpenseId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar despesa</DialogTitle>
						<DialogDescription>
							Tem a certeza que deseja eliminar esta despesa? Esta acção não
							pode ser desfeita.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeletingExpenseId(null)}
						>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							disabled={deleteExpense.isPending}
							onClick={() => {
								if (deletingExpenseId) {
									deleteExpense.mutate(
										{ id: deletingExpenseId },
										{
											onSuccess: () => {
												toast.success("Despesa eliminada");
												setDeletingExpenseId(null);
											},
											onError: (e) => toast.error(e.message),
										},
									);
								}
							}}
						>
							{deleteExpense.isPending ? "A eliminar..." : "Eliminar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ========================
// View Expense Dialog
// ========================
function ViewExpenseDialog({
	expense,
	onClose,
}: {
	expense: {
		id?: string;
		description?: string;
		totalAmount?: number;
		status?: string;
		dueDate?: string;
		notes?: string;
		vendor?: { name?: string; phone?: string };
		budgetCategory?: { name?: string };
		payments?: Array<{
			amount?: number;
			paymentDate?: string;
			method?: string;
		}>;
	};
	onClose: () => void;
}) {
	const expenseStatsQuery = useExpenseStats(expense.id ?? "");
	const expenseStats = expenseStatsQuery.data;
	const totalPaid = expenseStats?.totalPaid ?? 0;
	const totalAmount = expenseStats?.totalAmount ?? Number(expense.totalAmount ?? 0);
	const remaining = expenseStats?.remaining ?? totalAmount - totalPaid;
	const paymentRate = expenseStats?.paymentRate ?? 0;
	const vendor = expense.vendor;
	const category = expense.budgetCategory;
	const payments = expense.payments ?? [];

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{expense.description}</DialogTitle>
					<DialogDescription>Detalhes da despesa</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Valor total</p>
							<p className="font-semibold text-xl">
								{formatCurrency(totalAmount)}
							</p>
						</div>
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Estado</p>
							<Badge className={getStatusColor(expense.status ?? "PLANNED")}>
								{getStatusLabel(expense.status ?? "PLANNED", "expense")}
							</Badge>
						</div>
					</div>

					<div className="rounded border p-3">
						<p className="mb-1 text-muted-foreground text-xs">
							Progresso de pagamento
						</p>
						<div className="mb-1 flex items-center justify-between text-sm">
							<span>Pago: {formatCurrency(totalPaid)}</span>
							<span>
								Restante: {formatCurrency(remaining > 0 ? remaining : 0)}
							</span>
						</div>					<Progress value={paymentRate} />
					</div>

					<div className="grid grid-cols-2 gap-3">
						{expense.dueDate ? (
							<div className="rounded border p-3">
								<p className="text-muted-foreground text-xs">Data limite</p>
								<p className="font-medium text-sm">
									{formatDate(expense.dueDate)}
								</p>
							</div>
						) : null}
						{category && (
							<div className="rounded border p-3">
								<p className="text-muted-foreground text-xs">Categoria</p>
								<p className="font-medium text-sm">{category.name}</p>
							</div>
						)}
					</div>

					{vendor && (
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Fornecedor</p>
							<p className="font-medium text-sm">{vendor.name}</p>
							{vendor.phone ? (
								<p className="text-muted-foreground text-xs">
									📞 {vendor.phone}
								</p>
							) : null}
						</div>
					)}

					{expense.notes ? (
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Notas</p>
							<p className="text-sm">{expense.notes}</p>
						</div>
					) : null}

					{payments.length > 0 && (
						<div>
							<h4 className="mb-2 font-medium text-sm">
								Pagamentos ({payments.length})
							</h4>
							<div className="space-y-2">
								{payments.map((payment, i) => (
									<div
										key={i}
										className="flex items-center justify-between rounded border p-2.5 text-sm"
									>
										<div>
											<p className="font-medium">
												{formatCurrency(Number(payment.amount))}
											</p>
											<p className="text-muted-foreground text-xs">
												{payment.paymentDate
													? formatDate(payment.paymentDate)
													: "—"}{" "}
												· {payment.method}
											</p>
										</div>
										<Badge variant="outline" className="text-xs">
											{payment.method}
										</Badge>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ========================
// Budget Dialog (Create / Edit)
// ========================
function BudgetDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	initialValues?: {
		plannedAmount: number;
		reserveAmount: number;
		notes: string;
	};
	onSubmit: (values: {
		plannedAmount: number;
		reserveAmount?: number;
		notes?: string;
	}) => void;
	isLoading: boolean;
}) {
	const isEditing = !!initialValues;

	const form = useForm({
		defaultValues: {
			plannedAmount: initialValues?.plannedAmount ?? 0,
			reserveAmount: initialValues?.reserveAmount ?? 0,
			notes: initialValues?.notes ?? "",
		},
		onSubmit: async ({ value }) => {
			if (!value.plannedAmount || value.plannedAmount <= 0) {
				toast.error("O valor planeado deve ser maior que zero");
				return;
			}
			onSubmit({
				plannedAmount: value.plannedAmount,
				reserveAmount: value.reserveAmount || undefined,
				notes: value.notes || undefined,
			});
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar orçamento" : "Criar orçamento"}
					</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="plannedAmount">
						{(field) => (
							<div className="space-y-2">
								<Label>Valor planeado (Kz)</Label>
								<CurrencyInput
									value={field.state.value || 0}
									onChange={(v) => field.handleChange(v)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="reserveAmount">
						{(field) => (
							<div className="space-y-2">
								<Label>Reserva (Kz)</Label>
								<CurrencyInput
									value={field.state.value || 0}
									onChange={(v) => field.handleChange(v)}
									disabled={isLoading}
								/>
								<p className="text-muted-foreground text-xs">
									Valor de reserva para imprevistos
								</p>
							</div>
						)}
					</form.Field>
					<form.Field name="notes">
						{(field) => (
							<div className="space-y-2">
								<Label>Notas</Label>
								<Textarea
									placeholder="Observações sobre o orçamento (opcional)"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "A guardar..." : isEditing ? "Guardar" : "Criar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ========================
// Expense Dialog (Create / Edit)
// ========================
function ExpenseDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
	vendors = [],
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	initialValues?: {
		description: string;
		vendorId?: string | null;
		totalAmount: number;
		dueDate: string;
		notes: string;
		status?: string;
	};
	onSubmit: (values: any) => void;
	isLoading: boolean;
	vendors?: Array<{ id?: string; name?: string }>;
}) {
	const isEditing = !!initialValues;

	const form = useForm({
		defaultValues: {
			description: initialValues?.description ?? "",
			vendorId: initialValues?.vendorId ?? "",
			totalAmount: initialValues?.totalAmount ?? 0,
			dueDate: initialValues?.dueDate ?? "",
			notes: initialValues?.notes ?? "",
			status: (initialValues?.status ?? "PLANNED") as
				| "PLANNED"
				| "PARTIALLY_PAID"
				| "PAID"
				| "OVERDUE"
				| "CANCELLED",
		},
		onSubmit: async ({ value }) => {
			const result = expenseSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}
			onSubmit({
				...result.data,
				vendorId: value.vendorId || undefined,
				status: value.status,
			});
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar despesa" : "Adicionar despesa"}
					</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<Label>Descrição</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="vendorId">
						{(field) => (
							<div className="space-y-2">
								<Label>Fornecedor</Label>
								<Select
									value={field.state.value ?? ""}
									onValueChange={(v) => field.handleChange(v ?? "")}
									disabled={isLoading}
								>
									<SelectTrigger>
										<SelectValue placeholder="Selecionar fornecedor (opcional)" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">Sem fornecedor</SelectItem>
										{vendors.map((v) => (
											<SelectItem key={v.id} value={v.id}>
												{v.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</form.Field>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="totalAmount">
							{(field) => (
								<div className="space-y-2">
									<Label>Valor (Kz)</Label>
									<CurrencyInput
										value={field.state.value || 0}
										onChange={(v) => field.handleChange(v)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="dueDate">
							{(field) => (
								<div className="space-y-2">
									<Label>Data limite</Label>
									<Input
										type="date"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>
					{isEditing && (
						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label>Estado</Label>
									<select
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(
												e.target.value as
													| "PLANNED"
													| "PARTIALLY_PAID"
													| "PAID"
													| "OVERDUE"
													| "CANCELLED",
											)
										}
										disabled={isLoading}
										className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
									>
										{toSelectItems(EXPENSE_STATUS_LABELS).map((item) => (
											<option key={item.value} value={item.value}>
												{item.label}
											</option>
										))}
									</select>
								</div>
							)}
						</form.Field>
					)}
					<form.Field name="notes">
						{(field) => (
							<div className="space-y-2">
								<Label>Notas</Label>
								<Textarea
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "A guardar..." : isEditing ? "Guardar" : "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
