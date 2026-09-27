import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import { Checkbox } from "@muxima/ui/components/checkbox";
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
import { useForm, useStore } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { CurrencyInput } from "@/shared/components/currency-input";
import { QueryState } from "@/shared/components/states";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import {
	type SupplierCategoryValue,
	type SupplierFilters,
	type SupplierStatusValue,
	useAddSupplierPayment,
	useCreateSupplier,
	useDeleteSupplier,
	useDeleteSupplierPayment,
	useSetSupplierInstallments,
	useSupplier,
	useSupplierCategorySchema,
	useSupplierStats,
	useSuppliers,
	useUpdateSupplier,
} from "@/shared/queries/supplier-queries";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import {
	getStatusColor,
	getStatusLabel,
	INSTALLMENT_STATUS_LABELS,
	PAYMENT_METHOD_LABELS,
	SUPPLIER_CATEGORY_LABELS,
	SUPPLIER_STATUS_LABELS,
} from "@/utils/status-helpers";

export const Route = createFileRoute("/_private/events/$eventId/suppliers/")({
	component: SuppliersPage,
});

/** `YYYY-MM-DD` in local time, the format `input[type=date]` expects. */
function toDateInputValue(value: string | Date): string {
	const date = typeof value === "string" ? new Date(value) : value;
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

type SupplierListItem = NonNullable<
	ReturnType<typeof useSuppliers>["data"]
>["data"][number];

/**
 * The money of a supplier (price, paid, pending, percentage, payment status,
 * next due date) is resolved by the API. The table and the dialogs below only
 * render it and send the user's edits back.
 */
function SuppliersPage() {
	const { eventId } = Route.useParams();

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [filters, setFilters] = useState<SupplierFilters>({});

	const suppliersQuery = useSuppliers(eventId, { page, limit, ...filters });
	const statsQuery = useSupplierStats(eventId);
	const createSupplier = useCreateSupplier();
	const updateSupplier = useUpdateSupplier();
	const deleteSupplier = useDeleteSupplier();

	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editing, setEditing] = useState<SupplierListItem | null>(null);
	const [viewingId, setViewingId] = useState<string | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const suppliers = suppliersQuery.data?.data ?? [];
	const meta = suppliersQuery.data?.meta;
	const stats = statsQuery.data;

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-semibold text-2xl">Fornecedores</h1>
					<p className="text-muted-foreground text-sm">
						{stats?.total ?? 0} fornecedores
					</p>
				</div>
				<Button onClick={() => setShowCreateDialog(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar fornecedor
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title="Total contratado"
					value={formatCurrency(stats?.totalPrice ?? 0)}
				/>
				<StatsCard title="Pago" value={formatCurrency(stats?.totalPaid ?? 0)} />
				<StatsCard
					title="Por pagar"
					value={formatCurrency(stats?.totalPending ?? 0)}
				/>
				<StatsCard
					title="Em atraso"
					value={
						<span
							className={
								(stats?.overdueCount ?? 0) > 0 ? "text-destructive" : undefined
							}
						>
							{stats?.overdueCount ?? 0}
						</span>
					}
					description="fornecedores"
				/>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<Input
					placeholder="Pesquisar por nome, email ou telefone"
					value={filters.search ?? ""}
					onChange={(e) => {
						setPage(1);
						setFilters((f) => ({ ...f, search: e.target.value || undefined }));
					}}
					className="max-w-xs"
				/>
				<Select
					value={filters.category ?? "todas"}
					onValueChange={(v) =>
						setFilters((f) => ({
							...f,
							category:
								v === "todas" ? undefined : (v as SupplierCategoryValue),
						}))
					}
				>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="Categoria" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="todas">Todas as categorias</SelectItem>
						{Object.entries(SUPPLIER_CATEGORY_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select
					value={filters.paymentStatus ?? "todos"}
					onValueChange={(v) =>
						setFilters((f) => ({
							...f,
							paymentStatus:
								v === "todos"
									? undefined
									: (v as NonNullable<SupplierFilters["paymentStatus"]>),
						}))
					}
				>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Pagamento" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="todos">Todos os pagamentos</SelectItem>
						{Object.entries({
							PENDING: "Por pagar",
							INSTALLMENTS: "Em parcelas",
							OVERDUE: "Em atraso",
							PAID: "Pago",
						}).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<QueryState
				state={{
					isLoading: suppliersQuery.isLoading,
					isError: suppliersQuery.isError,
					isEmpty: suppliers.length === 0,
					hasData: suppliers.length > 0,
				}}
			>
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Fornecedor</TableHead>
								<TableHead>Categoria</TableHead>
								<TableHead className="text-right">Valor</TableHead>
								<TableHead className="w-44">Pagamento</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead className="w-28" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{suppliers.map((supplier) => (
								<TableRow key={supplier.id}>
									<TableCell>
										<p className="font-medium">{supplier.name}</p>
										{supplier.phone && (
											<p className="text-muted-foreground text-xs">
												{supplier.phone}
											</p>
										)}
									</TableCell>
									<TableCell>
										{SUPPLIER_CATEGORY_LABELS[supplier.category] ??
											supplier.category}
									</TableCell>
									<TableCell className="text-right">
										<p className="font-medium">
											{formatCurrency(supplier.price ?? 0)}
										</p>
										{(supplier.paid ?? 0) > 0 && (
											<p className="text-muted-foreground text-xs">
												{formatCurrency(supplier.paid ?? 0)} pago
											</p>
										)}
									</TableCell>
									<TableCell>
										<div className="space-y-1">
											<div className="flex items-center justify-between gap-2 text-xs">
												<Badge
													className={getStatusColor(supplier.paymentStatus)}
												>
													{getStatusLabel(
														supplier.paymentStatus,
														"supplierPayment",
													)}
												</Badge>
												<span className="text-muted-foreground">
													{supplier.percentage}%
												</span>
											</div>
											<Progress value={supplier.percentage} />
											{supplier.nextDueDate && (
												<p className="text-muted-foreground text-xs">
													Próximo: {formatDate(supplier.nextDueDate)}
												</p>
											)}
										</div>
									</TableCell>
									<TableCell>
										<Badge className={getStatusColor(supplier.status)}>
											{getStatusLabel(supplier.status, "supplier")}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												title="Ver detalhes"
												onClick={() => setViewingId(supplier.id)}
											>
												<Eye className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												title="Editar"
												onClick={() => setEditing(supplier)}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon-sm"
												className="text-destructive"
												title="Eliminar"
												onClick={() => setDeleteId(supplier.id)}
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

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={setPage}
					onLimitChange={(value) => {
						setLimit(value);
						setPage(1);
					}}
					disabled={suppliersQuery.isLoading}
				/>
			)}

			<SupplierDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				isLoading={createSupplier.isPending}
				onSubmit={(values) => {
					createSupplier.mutate(
						{ eventId, ...values },
						{
							onSuccess: () => {
								toast.success("Fornecedor adicionado");
								setShowCreateDialog(false);
							},
							onError: (error) => toast.error(error.message),
						},
					);
				}}
			/>

			{editing && (
				<SupplierDialog
					open
					onOpenChange={() => setEditing(null)}
					initialValues={{
						name: editing.name,
						category: editing.category as SupplierCategoryValue,
						price: Number(editing.price ?? 0),
						phone: editing.phone ?? "",
						email: editing.email ?? "",
						address: editing.address ?? "",
						description: editing.description ?? "",
						notes: editing.notes ?? "",
						status: editing.status as SupplierStatusValue,
					}}
					isLoading={updateSupplier.isPending}
					onSubmit={(values) => {
						updateSupplier.mutate(
							{ id: editing.id, ...values },
							{
								onSuccess: () => {
									toast.success("Fornecedor actualizado");
									setEditing(null);
								},
								onError: (error) => toast.error(error.message),
							},
						);
					}}
				/>
			)}

			{viewingId && (
				<SupplierDetailsDialog
					supplierId={viewingId}
					onClose={() => setViewingId(null)}
				/>
			)}

			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar fornecedor</DialogTitle>
						<DialogDescription>
							Os pagamentos, parcelas, documentos e itens de checklist ligados a
							este fornecedor serão eliminados. Esta acção não pode ser
							desfeita.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteId(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							disabled={deleteSupplier.isPending}
							onClick={() => {
								if (deleteId) {
									deleteSupplier.mutate(
										{ id: deleteId },
										{
											onSuccess: () => {
												toast.success("Fornecedor eliminado");
												setDeleteId(null);
											},
											onError: (error) => toast.error(error.message),
										},
									);
								}
							}}
						>
							{deleteSupplier.isPending ? "A eliminar..." : "Eliminar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ========================
// Details: money, payments and installments
// ========================
function SupplierDetailsDialog({
	supplierId,
	onClose,
}: {
	supplierId: string;
	onClose: () => void;
}) {
	const supplierQuery = useSupplier(supplierId);
	const addPayment = useAddSupplierPayment();
	const deletePayment = useDeleteSupplierPayment();
	const setInstallments = useSetSupplierInstallments();

	const supplier = supplierQuery.data;
	const [paymentOpen, setPaymentOpen] = useState(false);
	const [installmentsOpen, setInstallmentsOpen] = useState(false);

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{supplier?.name ?? "Fornecedor"}</DialogTitle>
					<DialogDescription>
						{supplier
							? `${SUPPLIER_CATEGORY_LABELS[supplier.category] ?? supplier.category} · ${getStatusLabel(supplier.status, "supplier")}`
							: "A carregar..."}
					</DialogDescription>
				</DialogHeader>

				<QueryState
					state={{
						isLoading: supplierQuery.isLoading,
						isError: supplierQuery.isError,
						isEmpty: !supplier,
						hasData: !!supplier,
					}}
				>
					{!!supplier && (
						<div className="space-y-4">
							<div className="grid grid-cols-3 gap-3 text-center">
								<div className="rounded border p-3">
									<p className="text-muted-foreground text-xs">Valor</p>
									<p className="font-semibold">
										{formatCurrency(supplier.money.total)}
									</p>
								</div>
								<div className="rounded border p-3">
									<p className="text-muted-foreground text-xs">Pago</p>
									<p className="font-semibold">
										{formatCurrency(supplier.money.paid)}
									</p>
								</div>
								<div className="rounded border p-3">
									<p className="text-muted-foreground text-xs">Por pagar</p>
									<p className="font-semibold">
										{formatCurrency(supplier.money.pending)}
									</p>
								</div>
							</div>

							<div className="rounded border p-3">
								<div className="mb-1 flex items-center justify-between text-sm">
									<span>
										{getStatusLabel(
											supplier.money.paymentStatus,
											"supplierPayment",
										)}
									</span>
									<span>{supplier.money.percentage}%</span>
								</div>
								<Progress value={supplier.money.percentage} />
							</div>

							<div className="flex gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={() => setPaymentOpen(true)}
								>
									Registar pagamento
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setInstallmentsOpen(true)}
								>
									Plano de parcelas
								</Button>
							</div>

							{supplier.timeline.length > 0 && (
								<div>
									<h4 className="mb-2 font-medium text-sm">Histórico</h4>
									<ul className="space-y-2">
										{supplier.timeline.map((entry) => (
											<li
												key={`${entry.type}-${entry.id}`}
												className="flex items-center justify-between rounded border p-2.5 text-sm"
											>
												<div>
													<p className="font-medium">
														{formatCurrency(entry.amount)}
													</p>
													<p className="text-muted-foreground text-xs">
														{formatDate(entry.date)} · {entry.label}
													</p>
												</div>
												{entry.type === "PAYMENT" && (
													<Button
														variant="ghost"
														size="icon-sm"
														className="text-destructive"
														title="Eliminar pagamento"
														onClick={() =>
															deletePayment.mutate(
																{ id: entry.id },
																{
																	onSuccess: () =>
																		toast.success("Pagamento eliminado"),
																	onError: (error) =>
																		toast.error(error.message),
																},
															)
														}
													>
														<Trash2 className="h-3.5 w-3.5" />
													</Button>
												)}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}
				</QueryState>

				<PaymentDialog
					open={paymentOpen}
					onOpenChange={setPaymentOpen}
					supplierId={supplierId}
					remaining={supplier?.money.pending ?? 0}
					isLoading={addPayment.isPending}
					onSubmit={(values) => {
						addPayment.mutate(values, {
							onSuccess: () => {
								toast.success("Pagamento registado");
								setPaymentOpen(false);
							},
							onError: (error) => toast.error(error.message),
						});
					}}
				/>

				<InstallmentsDialog
					open={installmentsOpen}
					onOpenChange={setInstallmentsOpen}
					supplierId={supplierId}
					price={supplier?.money.total ?? 0}
					installments={
						supplier?.installments.map((installment) => ({
							amount: installment.amount,
							dueDate: installment.dueDate,
							notes: installment.notes ?? undefined,
						})) ?? []
					}
					isLoading={setInstallments.isPending}
					onSubmit={(values) => {
						setInstallments.mutate(
							{ supplierId, installments: values.installments },
							{
								onSuccess: () => {
									toast.success("Plano de parcelas actualizado");
									setInstallmentsOpen(false);
								},
								onError: (error) => toast.error(error.message),
							},
						);
					}}
				/>

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
// Create / edit dialog
// ========================
function SupplierDialog({
	open,
	onOpenChange,
	initialValues,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	initialValues?: {
		name: string;
		category: SupplierCategoryValue;
		price: number;
		phone: string;
		email: string;
		address: string;
		description: string;
		notes: string;
		status: SupplierStatusValue;
	};
	onSubmit: (values: {
		name: string;
		category: SupplierCategoryValue;
		price?: number;
		phone?: string;
		email?: string;
		address?: string;
		description?: string;
		notes?: string;
		status?: SupplierStatusValue;
		customFields?: Record<string, unknown>;
	}) => void;
	isLoading: boolean;
}) {
	const isEditing = !!initialValues;
	const categorySchemaQuery = useSupplierCategorySchema();

	// The category specific fields come from the API, so they are held outside
	// the typed form: their names are only known at runtime.
	const [customFields, setCustomFields] = useState<Record<string, unknown>>({});

	const form = useForm({
		defaultValues: {
			name: initialValues?.name ?? "",
			category: (initialValues?.category ?? "OTHER") as SupplierCategoryValue,
			price: initialValues?.price ?? 0,
			phone: initialValues?.phone ?? "",
			email: initialValues?.email ?? "",
			address: initialValues?.address ?? "",
			description: initialValues?.description ?? "",
			notes: initialValues?.notes ?? "",
			status: (initialValues?.status ?? "PROSPECT") as SupplierStatusValue,
		},
		onSubmit: async ({ value }) => {
			const nonEmpty = Object.fromEntries(
				Object.entries(customFields).filter(
					([, entry]) => entry !== "" && entry !== undefined,
				),
			);
			onSubmit({
				...value,
				price: value.price || undefined,
				phone: value.phone || undefined,
				email: value.email || undefined,
				address: value.address || undefined,
				description: value.description || undefined,
				notes: value.notes || undefined,
				customFields: Object.keys(nonEmpty).length > 0 ? nonEmpty : undefined,
			});
		},
	});

	const category = useStore(form.store, (state) => state.values.category);
	const spec = categorySchemaQuery.data?.categories.find(
		(item) => item.category === category,
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar" : "Adicionar"} fornecedor
					</DialogTitle>
					<DialogDescription>
						O valor, os pagamentos e as parcelas alimentam o orçamento e o
						checklist do evento.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="supplier-name">Nome</Label>
								<Input
									id="supplier-name"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="category">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="supplier-category">Categoria</Label>
									<Select
										items={Object.entries(SUPPLIER_CATEGORY_LABELS).map(
											([value, label]) => ({ value, label }),
										)}
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as SupplierCategoryValue)
										}
									>
										<SelectTrigger id="supplier-category">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(SUPPLIER_CATEGORY_LABELS).map(
												([key, label]) => (
													<SelectItem key={key} value={key}>
														{label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="supplier-status">Estado</Label>
									<Select
										items={Object.entries(SUPPLIER_STATUS_LABELS).map(
											([value, label]) => ({ value, label }),
										)}
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as SupplierStatusValue)
										}
									>
										<SelectTrigger id="supplier-status">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(SUPPLIER_STATUS_LABELS).map(
												([key, label]) => (
													<SelectItem key={key} value={key}>
														{label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>

					<form.Field name="price">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="supplier-price">Valor acordado (Kz)</Label>
								<CurrencyInput
									id="supplier-price"
									value={field.state.value || 0}
									onChange={(v) => field.handleChange(v)}
									disabled={isLoading}
								/>
								<p className="text-muted-foreground text-xs">
									Deixe a zero enquanto o valor não estiver fechado.
								</p>
							</div>
						)}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="phone">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="supplier-phone">Telefone</Label>
									<Input
										id="supplier-phone"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="email">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="supplier-email">Email</Label>
									<Input
										id="supplier-email"
										type="email"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>

					<form.Field name="address">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="supplier-address">Morada</Label>
								<Input
									id="supplier-address"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>

					{!!spec?.fields.length && (
						<fieldset className="space-y-3 rounded border p-4">
							<legend className="px-1 font-medium text-sm">
								Dados de {spec.label}
							</legend>
							{spec.fields.map((field) => (
								<SupplierCustomField
									key={field.name}
									field={field}
									value={customFields[field.name]}
									onChange={(value: unknown) =>
										setCustomFields((current) => ({
											...current,
											[field.name]: value,
										}))
									}
									disabled={isLoading}
								/>
							))}
						</fieldset>
					)}

					<form.Field name="notes">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="supplier-notes">Notas</Label>
								<Textarea
									id="supplier-notes"
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

// ========================
// Payment dialog
// ========================
function PaymentDialog({
	open,
	onOpenChange,
	supplierId,
	remaining,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	supplierId: string;
	remaining: number;
	onSubmit: (values: {
		supplierId: string;
		amount: number;
		paymentDate: Date;
		method: keyof typeof PAYMENT_METHOD_LABELS;
		reference?: string;
	}) => void;
	isLoading: boolean;
}) {
	const form = useForm({
		defaultValues: {
			amount: 0,
			paymentDate: toDateInputValue(new Date()),
			method: "BANK_TRANSFER" as keyof typeof PAYMENT_METHOD_LABELS,
			reference: "",
		},
		onSubmit: async ({ value }) => {
			if (value.amount <= 0) {
				toast.error("O valor deve ser maior que zero");
				return;
			}
			onSubmit({
				supplierId,
				amount: value.amount,
				paymentDate: new Date(value.paymentDate),
				method: value.method,
				reference: value.reference || undefined,
			});
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Registar pagamento</DialogTitle>
					<DialogDescription>
						{remaining > 0
							? `Por pagar: ${formatCurrency(remaining)}`
							: "Não há valor em dívida."}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="amount">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="payment-amount">Valor (Kz)</Label>
								<CurrencyInput
									id="payment-amount"
									value={field.state.value || 0}
									onChange={(v) => field.handleChange(v)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="paymentDate">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="payment-date">Data</Label>
									<Input
										id="payment-date"
										type="date"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="method">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="payment-method">Método</Label>
									<Select
										items={Object.entries(PAYMENT_METHOD_LABELS).map(
											([value, label]) => ({ value, label }),
										)}
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(
												v as keyof typeof PAYMENT_METHOD_LABELS,
											)
										}
									>
										<SelectTrigger id="payment-method">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Object.entries(PAYMENT_METHOD_LABELS).map(
												([key, label]) => (
													<SelectItem key={key} value={key}>
														{label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>
					<form.Field name="reference">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="payment-reference">Referência</Label>
								<Input
									id="payment-reference"
									placeholder="Opcional"
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
							{isLoading ? "A guardar..." : "Registar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ========================
// Installments dialog
// ========================
function InstallmentsDialog({
	open,
	onOpenChange,
	supplierId,
	installments,
	price,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	supplierId: string;
	price: number;
	installments: Array<{
		amount: number;
		dueDate: string | Date;
		notes?: string;
	}>;
	onSubmit: (values: {
		supplierId: string;
		installments: Array<{
			amount: number;
			dueDate: Date;
			notes?: string;
		}>;
	}) => void;
	isLoading: boolean;
}) {
	const [rows, setRows] = useState(() =>
		installments.length > 0
			? installments.map((installment) => ({
					amount: String(Number(installment.amount)),
					dueDate: toDateInputValue(installment.dueDate),
					notes: installment.notes ?? "",
				}))
			: [{ amount: "", dueDate: "", notes: "" }],
	);

	const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
	const exceedsPrice = price > 0 && total > price;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (next) {
					setRows(
						installments.length > 0
							? installments.map((installment) => ({
									amount: String(Number(installment.amount)),
									dueDate: toDateInputValue(installment.dueDate),
									notes: installment.notes ?? "",
								}))
							: [{ amount: "", dueDate: "", notes: "" }],
					);
				}
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Plano de parcelas</DialogTitle>
					<DialogDescription>
						A soma não pode ultrapassar o valor acordado (
						{formatCurrency(price)}).
					</DialogDescription>
				</DialogHeader>

				<ul className="space-y-3">
					{rows.map((row, index) => (
						<li
							key={index}
							className="grid grid-cols-[1fr_9rem_auto] items-end gap-2"
						>
							<div className="space-y-1">
								<Label htmlFor={`installment-amount-${index}`}>
									Valor (Kz)
								</Label>
								<Input
									id={`installment-amount-${index}`}
									type="number"
									min={0}
									step={1000}
									value={row.amount}
									onChange={(e) =>
										setRows((current) =>
											current.map((r, i) =>
												i === index ? { ...r, amount: e.target.value } : r,
											),
										)
									}
									disabled={isLoading}
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor={`installment-due-${index}`}>Vence</Label>
								<Input
									id={`installment-due-${index}`}
									type="date"
									value={row.dueDate}
									onChange={(e) =>
										setRows((current) =>
											current.map((r, i) =>
												i === index ? { ...r, dueDate: e.target.value } : r,
											),
										)
									}
									disabled={isLoading}
								/>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-destructive"
								title="Remover parcela"
								disabled={isLoading || rows.length === 1}
								onClick={() =>
									setRows((current) => current.filter((_, i) => i !== index))
								}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</li>
					))}
				</ul>

				<div className="flex items-center justify-between text-sm">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() =>
							setRows((current) => [
								...current,
								{ amount: "", dueDate: "", notes: "" },
							])
						}
						disabled={isLoading}
					>
						<Plus className="mr-2 h-3.5 w-3.5" />
						Adicionar parcela
					</Button>
					<span className={exceedsPrice ? "font-medium text-destructive" : ""}>
						Total: {formatCurrency(total)}
					</span>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						disabled={isLoading || exceedsPrice}
						onClick={() => {
							const valid = rows.filter(
								(row) => Number(row.amount) > 0 && row.dueDate,
							);
							if (valid.length === 0) {
								toast.error("Adicione pelo menos uma parcela com valor e data");
								return;
							}
							onSubmit({
								supplierId,
								installments: valid.map((row) => ({
									amount: Number(row.amount),
									dueDate: new Date(row.dueDate),
								})),
							});
						}}
					>
						{isLoading ? "A guardar..." : "Guardar plano"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ========================
// Category specific fields, driven by the API spec
// ========================
type SupplierFieldSpec = {
	name: string;
	label: string;
	type: "text" | "textarea" | "number" | "boolean" | "date" | "tags" | "items";
	placeholder?: string;
	required?: boolean;
};

type SupplierProductItem = { name: string; quantity: string; unit: string };

/**
 * Renders one field of `suppliers.getCategorySchema`. Adding a field in the
 * API module is enough for it to show up here: the input kind is decided by
 * `field.type` and the value is validated again by the API on write.
 */
function SupplierCustomField({
	field,
	value,
	onChange,
	disabled,
}: {
	field: SupplierFieldSpec;
	value: unknown;
	onChange: (value: unknown) => void;
	disabled: boolean;
}) {
	const id = `supplier-custom-${field.name}`;
	const label = field.required ? (
		<span>
			{field.label} <span className="text-destructive">*</span>
		</span>
	) : (
		field.label
	);

	if (field.type === "boolean") {
		return (
			<div className="flex items-center gap-2 pt-1">
				<Checkbox
					id={id}
					checked={value === true}
					onCheckedChange={(checked) => onChange(checked === true)}
					disabled={disabled}
				/>
				<Label htmlFor={id} className="font-normal">
					{label}
				</Label>
			</div>
		);
	}

	if (field.type === "tags") {
		const list = Array.isArray(value) ? (value as string[]) : [];
		return (
			<div className="space-y-2">
				<Label htmlFor={id}>{label}</Label>
				<Input
					id={id}
					placeholder="Separados por vírgula"
					value={list.join(", ")}
					onChange={(e) =>
						onChange(
							e.target.value
								.split(",")
								.map((entry) => entry.trim())
								.filter(Boolean),
						)
					}
					disabled={disabled}
				/>
			</div>
		);
	}

	if (field.type === "items") {
		const items: SupplierProductItem[] = Array.isArray(value)
			? (value as unknown as SupplierProductItem[])
			: [];
		return (
			<div className="space-y-2">
				<Label>{label}</Label>
				{items.map((item, index) => (
					<div
						key={index}
						className="grid grid-cols-[1fr_5rem_6rem_auto] gap-2"
					>
						<Input
							aria-label={`${field.label} ${index + 1} - nome`}
							placeholder="Item"
							value={item.name}
							onChange={(e) => {
								const next = [...items];
								next[index] = { ...item, name: e.target.value };
								onChange(next);
							}}
							disabled={disabled}
						/>
						<Input
							aria-label={`${field.label} ${index + 1} - quantidade`}
							type="number"
							min={0}
							placeholder="Qtd"
							value={item.quantity}
							onChange={(e) => {
								const next = [...items];
								next[index] = { ...item, quantity: e.target.value };
								onChange(next);
							}}
							disabled={disabled}
						/>
						<Input
							aria-label={`${field.label} ${index + 1} - unidade`}
							placeholder="Un."
							value={item.unit}
							onChange={(e) => {
								const next = [...items];
								next[index] = { ...item, unit: e.target.value };
								onChange(next);
							}}
							disabled={disabled}
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="text-destructive"
							title={`Remover ${item.name || "item"}`}
							disabled={disabled}
							onClick={() => onChange(items.filter((_, i) => i !== index))}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				))}
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={disabled}
					onClick={() =>
						onChange([...items, { name: "", quantity: "", unit: "" }])
					}
				>
					<Plus className="mr-2 h-3.5 w-3.5" />
					Adicionar item
				</Button>
			</div>
		);
	}

	if (field.type === "textarea") {
		return (
			<div className="space-y-2">
				<Label htmlFor={id}>{label}</Label>
				<Textarea
					id={id}
					placeholder={field.placeholder}
					value={typeof value === "string" ? value : ""}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
				/>
			</div>
		);
	}

	if (field.type === "date") {
		return (
			<div className="space-y-2">
				<Label htmlFor={id}>{label}</Label>
				<Input
					id={id}
					type="date"
					value={
						value instanceof Date
							? toDateInputValue(value)
							: typeof value === "string"
								? value.slice(0, 10)
								: ""
					}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
				/>
			</div>
		);
	}

	if (field.type === "number") {
		return (
			<div className="space-y-2">
				<Label htmlFor={id}>{label}</Label>
				<Input
					id={id}
					type="number"
					min={0}
					step="any"
					placeholder={field.placeholder}
					value={value === undefined || value === null ? "" : String(value)}
					onChange={(e) =>
						onChange(e.target.value === "" ? undefined : Number(e.target.value))
					}
					disabled={disabled}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				placeholder={field.placeholder}
				value={typeof value === "string" ? value : ""}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
			/>
		</div>
	);
}
