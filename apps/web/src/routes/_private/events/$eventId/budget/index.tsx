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
import { CurrencyInput } from "@/shared/components/currency-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Progress } from "@muxima/ui/components/progress";
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
import { createFileRoute } from "@tanstack/react-router";
import { Eye, Pencil, Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useBudget,
	useCreateExpense,
	useDeleteExpense,
	useExpenses,
	useUpdateExpense,
	useUpsertBudget,
} from "@/shared/queries/budget-queries";
import { useVendors } from "@/shared/queries/vendor-queries";
import { expenseSchema } from "@/utils/budget-schemas";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import {
	EXPENSE_STATUS_LABELS,
	getStatusColor,
	getStatusLabel,
	INVENTORY_CATEGORY_LABELS,
	INVENTORY_UNIT_LABELS,
	toSelectItems,
} from "@/utils/status-helpers";

export const Route = createFileRoute("/_private/events/$eventId/budget/")({
	component: BudgetPage,
});

function BudgetPage() {
	const { eventId } = Route.useParams();

	const budgetQuery = useBudget(eventId);
	const expensesQuery = useExpenses(eventId);
	const vendorsQuery = useVendors(eventId);
	const createExpense = useCreateExpense();
	const updateExpense = useUpdateExpense();
	const deleteExpense = useDeleteExpense();
	const upsertBudget = useUpsertBudget();

	const vendors = (vendorsQuery.data ?? []) as Array<Record<string, unknown>>;

	const [showCreateExpenseDialog, setShowCreateExpenseDialog] = useState(false);
	const [showEditBudgetDialog, setShowEditBudgetDialog] = useState(false);
	const [editingExpense, setEditingExpense] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [viewingExpense, setViewingExpense] = useState<Record<
		string,
		unknown
	> | null>(null);
	const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
		null,
	);

	const budget = budgetQuery.data as Record<string, unknown> | undefined;
	const expenses = expensesQuery.data ?? [];
	const plannedAmount = Number(budget?.plannedAmount ?? 0);
	const reserveAmount = Number(budget?.reserveAmount ?? 0);
	const totalExpenses = expenses.reduce(
		(sum: number, e: Record<string, unknown>) =>
			sum + Number(e.totalAmount || 0),
		0,
	);
	const remaining = plannedAmount - totalExpenses;
	const percent =
		plannedAmount > 0 ? Math.round((totalExpenses / plannedAmount) * 100) : 0;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Orçamento</h1>
					{budget && (
						<p className="text-muted-foreground text-sm">
							{budget.notes ? String(budget.notes) : "Orçamento definido"}
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

			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="text-muted-foreground text-xs">
							Planeado
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl">
							{formatCurrency(plannedAmount)}
						</div>
						{reserveAmount > 0 && (
							<p className="mt-1 text-muted-foreground text-xs">
								Reserva: {formatCurrency(reserveAmount)}
							</p>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-muted-foreground text-xs">
							Gasto
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-semibold text-2xl text-amber-600">
							{formatCurrency(totalExpenses)}
						</div>
						<Progress value={percent} className="mt-2" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-muted-foreground text-xs">
							Disponível
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div
							className={`font-semibold text-2xl ${remaining < 0 ? "text-red-600" : "text-green-600"}`}
						>
							{formatCurrency(remaining > 0 ? remaining : 0)}
						</div>
					</CardContent>
				</Card>
			</div>

			<QueryState
				state={{
					isLoading: expensesQuery.isLoading,
					isError: expensesQuery.isError,
					isEmpty: expenses.length === 0,
					hasData: expenses.length > 0,
				}}
			>
				<Card>
					<Table>					<TableHeader>
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
							{expenses.map((expense: Record<string, unknown>) => (
								<TableRow key={expense.id as string}>										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												{expense.description as string}
												{expense.inventoryItem && (
													<Badge variant="outline" className="text-xs">
														<Package className="mr-1 h-3 w-3" />
														Inventário
													</Badge>
												)}
											</div>
									</TableCell>
									<TableCell>
										{expense.vendor
											? String((expense.vendor as Record<string, unknown>).name)
											: "—"}
									</TableCell>
									<TableCell>
										{formatCurrency(Number(expense.totalAmount))}
									</TableCell>
									<TableCell>
										<Badge
											className={getStatusColor(
												(expense.status as string) || "PLANNED",
											)}
										>
											{getStatusLabel(
												(expense.status as string) || "PLANNED",
												"expense",
											)}
										</Badge>
									</TableCell>
									<TableCell>
										{expense.dueDate
											? formatDate(expense.dueDate as string)
											: "—"}
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
												onClick={() =>
													setDeletingExpenseId(expense.id as string)
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
			</QueryState>

			{/* Edit Budget Dialog */}
			<BudgetDialog
				open={showEditBudgetDialog}
				onOpenChange={setShowEditBudgetDialog}
				initialValues={
					budget
						? {
								plannedAmount: Number(budget.plannedAmount ?? 0),
								reserveAmount: Number(budget.reserveAmount ?? 0),
								notes: String(budget.notes ?? ""),
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
				eventId={eventId}
			/>

			{/* Edit Expense Dialog */}
			{editingExpense && (
				<ExpenseDialog
					open={!!editingExpense}
					onOpenChange={() => setEditingExpense(null)}
					vendors={vendors}
					initialValues={{
						description: String(editingExpense.description ?? ""),
						vendorId: (editingExpense.vendorId as string) || null,
						totalAmount: Number(editingExpense.totalAmount ?? 0),
						dueDate: editingExpense.dueDate
							? new Date(editingExpense.dueDate as string)
									.toISOString()
									.split("T")[0]
							: "",
						notes: String(editingExpense.notes ?? ""),
						status: String(editingExpense.status ?? "PLANNED"),
						// Inventory sync
						addToInventory: !!(editingExpense.inventoryItem as Record<string, unknown> | null),
						inventoryCategory:
							(editingExpense.inventoryItem as Record<string, unknown> | null)
								?.category as string || "OTHER",
						inventoryUnit:
							(editingExpense.inventoryItem as Record<string, unknown> | null)
								?.unit as string || "UNIT",
						inventoryPlannedQuantity:
							Number((editingExpense.inventoryItem as Record<string, unknown> | null)
								?.plannedQuantity) || 0,
						inventoryUnitPrice:
							Number((editingExpense.inventoryItem as Record<string, unknown> | null)
								?.unitPrice) || 0,
					}}
					onSubmit={(values) => {
						updateExpense.mutate(
							{ id: editingExpense.id as string, ...values },
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
					eventId={eventId}
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
	expense: Record<string, unknown>;
	onClose: () => void;
}) {
	const totalPaid = (
		(expense.payments as Array<Record<string, unknown>>) ?? []
	).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
	const totalAmount = Number(expense.totalAmount ?? 0);
	const remaining = totalAmount - totalPaid;
	const vendor = expense.vendor as Record<string, unknown> | undefined;
	const category = expense.budgetCategory as
		| Record<string, unknown>
		| undefined;
	const payments = (expense.payments as Array<Record<string, unknown>>) ?? [];

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{String(expense.description)}</DialogTitle>
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
							<Badge
								className={getStatusColor(String(expense.status ?? "PLANNED"))}
							>
								{getStatusLabel(String(expense.status ?? "PLANNED"), "expense")}
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
						</div>
						<Progress
							value={
								totalAmount > 0
									? Math.round((totalPaid / totalAmount) * 100)
									: 0
							}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						{expense.dueDate ? (
							<div className="rounded border p-3">
								<p className="text-muted-foreground text-xs">Data limite</p>
								<p className="font-medium text-sm">
									{formatDate(expense.dueDate as string)}
								</p>
							</div>
						) : null}
						{category && (
							<div className="rounded border p-3">
								<p className="text-muted-foreground text-xs">Categoria</p>
								<p className="font-medium text-sm">{String(category.name)}</p>
							</div>
						)}
					</div>

					{vendor && (
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Fornecedor</p>
							<p className="font-medium text-sm">{String(vendor.name)}</p>
							{vendor.phone ? (
								<p className="text-muted-foreground text-xs">
									📞 {String(vendor.phone)}
								</p>
							) : null}
						</div>
					)}

				{(expense.inventoryItem as Record<string, unknown> | null) && (
					<div className="rounded border p-3">
						<p className="text-muted-foreground text-xs">Item de inventário</p>
						<div className="mt-1 flex items-center gap-2">
							<Package className="h-4 w-4" />
							<p className="font-medium text-sm">
								{String((expense.inventoryItem as Record<string, unknown>).name)}
							</p>
						</div>
						<p className="text-muted-foreground text-xs">
							{String((expense.inventoryItem as Record<string, unknown>).plannedQuantity)} {" "}
							{String((expense.inventoryItem as Record<string, unknown>).unit)}
							{Number((expense.inventoryItem as Record<string, unknown>).unitPrice) > 0
								? ` · ${formatCurrency(Number((expense.inventoryItem as Record<string, unknown>).unitPrice))}/unid`
								: ""}
						</p>
					</div>
				)}

					{expense.notes ? (
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Notas</p>
							<p className="text-sm">{String(expense.notes)}</p>
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
													? formatDate(String(payment.paymentDate))
													: "—"}{" "}
												· {String(payment.method)}
											</p>
										</div>
										<Badge variant="outline" className="text-xs">
											{String(payment.method)}
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
}// ========================
// Expense Dialog (Create / Edit)
// ========================
function ExpenseDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
	vendors = [],
	eventId,
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
		addToInventory?: boolean;
		inventoryCategory?: string;
		inventoryUnit?: string;
		inventoryPlannedQuantity?: number;
		inventoryUnitPrice?: number;
	};
	onSubmit: (values: any) => void;
	isLoading: boolean;
	vendors?: Array<Record<string, unknown>>;
	eventId?: string;
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
			addToInventory: initialValues?.addToInventory ?? false,
			inventoryCategory: (initialValues?.inventoryCategory ?? "OTHER") as any,
			inventoryUnit: (initialValues?.inventoryUnit ?? "UNIT") as any,
			inventoryPlannedQuantity: initialValues?.inventoryPlannedQuantity ?? 0,
			inventoryUnitPrice: initialValues?.inventoryUnitPrice ?? 0,
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
				addToInventory: value.addToInventory,
				inventoryCategory: value.addToInventory ? value.inventoryCategory : undefined,
				inventoryUnit: value.addToInventory ? value.inventoryUnit : undefined,
				inventoryPlannedQuantity: value.addToInventory ? value.inventoryPlannedQuantity : undefined,
				inventoryUnitPrice: value.addToInventory ? value.inventoryUnitPrice : undefined,
			});
		},
	});

	const showInventory = form.useStore((s) => s.values.addToInventory);

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
											<SelectItem
												key={v.id as string}
												value={v.id as string}
											>
												{v.name as string}
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
										onChange={(e) => field.handleChange(e.target.value as any)}
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

					{/* ── Inventory Section ──────────────────────────── */}
					<div className="rounded-md border border-dashed p-4 space-y-4">
						<form.Field name="addToInventory">
							{(field) => (
								<label className="flex items-center gap-2 cursor-pointer">
									<input
									type="checkbox"
									checked={field.state.value}
									onChange={(e) => field.handleChange(e.target.checked)}
									className="h-4 w-4 rounded border-gray-300"
									disabled={isLoading}
								/>
									<div className="flex items-center gap-2">
										<Package className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium text-sm">
											Faz parte do inventário?
										</span>
									</div>
								</label>
							)}
						</form.Field>

						{showInventory && (
							<div className="space-y-4 pt-2">
								<div className="grid grid-cols-2 gap-4">
									<form.Field name="inventoryCategory">
										{(field) => (
											<div className="space-y-2">
												<Label>Categoria</Label>
												<Select
													items={Object.entries(INVENTORY_CATEGORY_LABELS).map(
														([value, label]) => ({ value, label }),
													)}
													value={field.state.value}
													onValueChange={(v) => field.handleChange(v as any)}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{Object.entries(INVENTORY_CATEGORY_LABELS).map(
															([k, l]) => (
																<SelectItem key={k} value={k}>
																	{l}
																</SelectItem>
															),
														)}
													</SelectContent>
												</Select>
											</div>
										)}
									</form.Field>
									<form.Field name="inventoryUnit">
										{(field) => (
											<div className="space-y-2">
												<Label>Unidade</Label>
												<Select
													items={Object.entries(INVENTORY_UNIT_LABELS).map(
														([value, label]) => ({ value, label }),
													)}
													value={field.state.value}
													onValueChange={(v) => field.handleChange(v as any)}
												>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{Object.entries(INVENTORY_UNIT_LABELS).map(
															([k, l]) => (
																<SelectItem key={k} value={k}>
																	{l}
																</SelectItem>
															),
													)}
													</SelectContent>
												</Select>
											</div>
										)}
									</form.Field>
								</div>
								<div className="grid grid-cols-2 gap-4">
									<form.Field name="inventoryPlannedQuantity">
										{(field) => (
											<div className="space-y-2">
												<Label>Quantidade planeada</Label>
												<Input
													type="number"
													value={field.state.value || ""}
													onChange={(e) =>
														field.handleChange(Number(e.target.value) || 0)
													}
													disabled={isLoading}
												/>
											</div>
										)}
									</form.Field>
									<form.Field name="inventoryUnitPrice">
										{(field) => (
											<div className="space-y-2">
												<Label>Preço por unidade (Kz)</Label>
												<Input
													type="number"
													value={field.state.value || ""}
													onChange={(e) =>
														field.handleChange(Number(e.target.value) || 0)
													}
													disabled={isLoading}
												/>
											</div>
										)}
									</form.Field>
								</div>
							</div>
						)}
					</div>

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
