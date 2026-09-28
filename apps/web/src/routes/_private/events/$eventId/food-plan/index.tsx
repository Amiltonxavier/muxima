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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@muxima/ui/components/tabs";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ChartColumn,
	Loader2,
	Pencil,
	Plus,
	ShoppingCart,
	Trash2,
	UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { StatChart } from "@/shared/components/charts";
import { MetricProgressCard, StatsGrid } from "@/shared/components/metrics";
import { QueryState } from "@/shared/components/states";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import {
	type FoodPlanCategoryValue,
	type FoodPlanStatusValue,
	type FoodPlanUnitValue,
	useAddFoodPlanItem,
	useDeleteFoodPlanItem,
	useFoodPlan,
	useFoodPlanStats,
	useSetFoodPlanSupplier,
	useUpdateFoodPlanItem,
	useUpdateFoodPlanNotes,
} from "@/shared/queries/food-plan-queries";
import { useSuppliers } from "@/shared/queries/supplier-queries";
import {
	FOOD_PLAN_CATEGORY_LABELS,
	FOOD_PLAN_STATUS_LABELS,
	FOOD_PLAN_UNIT_LABELS,
	getStatusColor,
	getStatusLabel,
	toSelectItems,
} from "@/utils/status-helpers";

export const Route = createFileRoute("/_private/events/$eventId/food-plan/")({
	component: FoodPlanPage,
});

type FoodPlanItemRow = {
	id: string;
	name: string;
	category: string;
	quantity: number;
	unit: string;
	description: string | null;
	notes: string | null;
	status: string;
	position: number;
	createdAt: string | Date;
	updatedAt: string | Date;
	customFields: unknown;
};

const CATEGORY_COLORS: Record<string, string> = {
	STARTER: "#22c55e",
	MAIN_COURSE: "#3b82f6",
	SIDE_DISH: "#a855f7",
	DESSERT: "#ec4899",
	FRUIT: "#f59e0b",
	OTHER: "#64748b",
};

/**
 * O plano de alimentação não tem preços por desenho: o dinheiro do catering,
 * do bolo e dos doces vive no fornecedor, para o mesmo gasto nunca ser
 * contado duas vezes no orçamento. Aqui só se gere a lista, o fornecedor
 * único e a apresentação das estatísticas calculadas pela API.
 */
function FoodPlanPage() {
	const { eventId } = Route.useParams();

	const [itemDialogOpen, setItemDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<FoodPlanItemRow | null>(null);
	const [deletingItem, setDeletingItem] = useState<FoodPlanItemRow | null>(
		null,
	);
	const [showSupplierDialog, setShowSupplierDialog] = useState(false);
	const [showNotesDialog, setShowNotesDialog] = useState(false);

	const planQuery = useFoodPlan(eventId);
	const statsQuery = useFoodPlanStats(eventId);
	const addItem = useAddFoodPlanItem();
	const updateItem = useUpdateFoodPlanItem();
	const deleteItem = useDeleteFoodPlanItem();
	const setSupplier = useSetFoodPlanSupplier();
	const updateNotes = useUpdateFoodPlanNotes();

	const plan = planQuery.data;
	const stats = statsQuery.data;
	const items = (plan?.items ?? []) as FoodPlanItemRow[];

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-semibold text-2xl">Alimentação</h1>
					<p className="text-muted-foreground text-sm">
						Plano de refeições do evento. Os valores monetários ficam no
						fornecedor, não no plano.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={() => setShowNotesDialog(true)}>
						Notas
					</Button>
					<Button
						onClick={() => {
							setEditingItem(null);
							setItemDialogOpen(true);
						}}
					>
						<Plus className="mr-2 h-4 w-4" />
						Novo item
					</Button>
				</div>
			</div>

			{statsQuery.isLoading ? (
				<StatsGrid columns={4}>
					{["card-1", "card-2", "card-3", "card-4"].map((id) => (
						<Card key={id}>
							<CardHeader>
								<div className="h-4 w-20 animate-pulse rounded bg-muted" />
							</CardHeader>
							<CardContent>
								<div className="h-8 w-24 animate-pulse rounded bg-muted" />
							</CardContent>
						</Card>
					))}
				</StatsGrid>
			) : (
				<StatsGrid columns={4}>
					<StatsCard
						title="Itens"
						value={stats?.totalItems ?? 0}
						description={
							(stats?.pendingItems ?? 0) > 0
								? `${stats?.pendingItems} pendentes`
								: undefined
						}
						icon={<UtensilsCrossed className="h-4 w-4" />}
					/>
					<StatsCard
						title="Concluídos"
						value={stats?.completedItems ?? 0}
						description={
							(stats?.inProgressItems ?? 0) > 0
								? `${stats?.inProgressItems} em curso`
								: undefined
						}
					/>
					<MetricProgressCard
						title="Progresso"
						value={stats?.completedItems ?? 0}
						limit={stats?.totalItems ?? 0}
						percentage={stats?.completionPercentage}
						label={`${stats?.completionPercentage ?? 0}%`}
						description={`${stats?.totalQuantity ?? 0} unidades no total`}
					/>
					<StatsCard
						title="Fornecedor"
						value={
							stats?.hasSupplier
								? (stats.supplierName ?? "—")
								: "Sem fornecedor"
						}
						description={
							stats?.hasSupplier
								? "Catering associado"
								: "Associe o fornecedor de catering"
						}
						icon={<ShoppingCart className="h-4 w-4" />}
					/>
				</StatsGrid>
			)}

			{/* CTA de associação: o nome do fornecedor já vive no card do grid;
			    este cartão só existe enquanto não há catering associado. */}
			{stats && !stats.hasSupplier && (
				<Card>
					<CardContent className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
						<p className="text-muted-foreground text-sm">
							Associe o fornecedor de catering ao plano de alimentação.
						</p>
						<Button
							variant="outline"
							onClick={() => setShowSupplierDialog(true)}
						>
							<ShoppingCart className="mr-2 h-4 w-4" />
							Associar fornecedor
						</Button>
					</CardContent>
				</Card>
			)}

			<Tabs defaultValue="lista">
				<TabsList>
					<TabsTrigger value="lista">Lista</TabsTrigger>
					<TabsTrigger value="analytics">
						<ChartColumn className="mr-2 h-4 w-4" />
						Analytics
					</TabsTrigger>
				</TabsList>

				<TabsContent value="lista">
					<QueryState
						state={{
							isLoading: planQuery.isLoading,
							isError: planQuery.isError,
							isEmpty: items.length === 0,
							hasData: items.length > 0,
						}}
					>
						<Card>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Item</TableHead>
										<TableHead>Categoria</TableHead>
										<TableHead className="text-right">Quantidade</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="w-24 text-right">Ações</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{items.map((item) => {
										const _isCompleted = item.status === "COMPLETED";
										return (
											<TableRow key={item.id}>
												<TableCell>
													<div className="space-y-0.5">
														<span className="font-medium">{item.name}</span>
														{item.description && (
															<p className="text-muted-foreground text-xs">
																{item.description}
															</p>
														)}
													</div>
												</TableCell>
												<TableCell>
													<Badge variant="outline">
														{FOOD_PLAN_CATEGORY_LABELS[item.category] ??
															item.category}
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													{item.quantity}{" "}
													{FOOD_PLAN_UNIT_LABELS[item.unit]?.toLowerCase() ??
														item.unit.toLowerCase()}
												</TableCell>
												<TableCell>
													<Badge
														variant="outline"
														className={getStatusColor(item.status)}
													>
														{getStatusLabel(item.status, "foodPlan")}
													</Badge>
												</TableCell>
												<TableCell className="text-right">
													<div className="flex justify-end gap-1">
														<Button
															variant="ghost"
															size="icon"
															onClick={() => {
																setEditingItem(item);
																setItemDialogOpen(true);
															}}
															aria-label="Editar item"
														>
															<Pencil className="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															onClick={() => setDeletingItem(item)}
															aria-label="Eliminar item"
														>
															<Trash2 className="h-4 w-4 text-destructive" />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</Card>
					</QueryState>
				</TabsContent>

				<TabsContent value="analytics">
					{statsQuery.isLoading ? (
						<Card>
							<CardContent className="animate-pulse space-y-4 pt-6">
								<div className="h-40 rounded bg-muted" />
								<div className="h-8 w-48 rounded bg-muted" />
							</CardContent>
						</Card>
					) : (
						<div className="grid gap-4 lg:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle className="text-base">
										Itens por categoria
									</CardTitle>
								</CardHeader>
								<CardContent>
									{!stats || stats.byCategory.length === 0 ? (
										<p className="text-muted-foreground text-sm">
											Sem itens para mostrar.
										</p>
									) : (
										<div className="space-y-4">
											<StatChart
												data={stats.byCategory.map((entry) => ({
													label: entry.label,
													value: entry.count,
													color: CATEGORY_COLORS[entry.key] ?? "#3b82f6",
												}))}
											/>
											<div className="space-y-1">
												{stats.byCategory.map((entry) => (
													<div
														key={entry.key}
														className="flex items-center justify-between text-sm"
													>
														<span>{entry.label}</span>
														<span className="text-muted-foreground">
															{entry.count} itens · {entry.totalQuantity}
															unidades · {entry.completed} concluídos
														</span>
													</div>
												))}
											</div>
										</div>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-base">Resumo</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 text-sm">
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Total de itens
										</span>
										<span className="font-medium">
											{stats?.totalItems ?? 0}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Quantidade total
										</span>
										<span className="font-medium">
											{stats?.totalQuantity ?? 0}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Categoria com mais itens
										</span>
										<span className="font-medium">
											{!stats || stats.byCategory.length === 0
												? "—"
												: [...stats.byCategory].sort(
														(a, b) => b.count - a.count,
													)[0].label}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Item com maior quantidade
										</span>
										<span className="font-medium">
											{items.length > 0
												? [...items].sort((a, b) => b.quantity - a.quantity)[0]
														.name
												: "—"}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-muted-foreground">
											Fornecedor do plano
										</span>
										<span className="font-medium">
											{stats?.hasSupplier
												? (stats.supplierName ?? "—")
												: "Sem fornecedor"}
										</span>
									</div>
									{plan?.notes && (
										<div className="space-y-1 border-t pt-3">
											<span className="text-muted-foreground">Notas</span>
											<p className="whitespace-pre-line">{plan.notes}</p>
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					)}
				</TabsContent>
			</Tabs>

			<FoodPlanItemDialog
				key={editingItem?.id ?? "new"}
				open={itemDialogOpen}
				onOpenChange={setItemDialogOpen}
				editingItem={editingItem}
				isPending={addItem.isPending || updateItem.isPending}
				onSubmit={(values) => {
					if (editingItem) {
						updateItem.mutate(
							{
								id: editingItem.id,
								eventId,
								name: values.name,
								category: values.category,
								quantity: values.quantity,
								unit: values.unit,
								description: values.description || null,
								notes: values.notes || null,
								status: values.status,
							},
							{
								onSuccess: () => {
									toast.success("Item atualizado");
									setItemDialogOpen(false);
								},
								onError: (error) => toast.error(error.message),
							},
						);
						return;
					}
					addItem.mutate(
						{
							eventId,
							name: values.name,
							category: values.category,
							quantity: values.quantity,
							unit: values.unit,
							description: values.description || undefined,
							notes: values.notes || undefined,
							status: values.status,
						},
						{
							onSuccess: () => {
								toast.success("Item adicionado ao plano");
								setItemDialogOpen(false);
							},
							onError: (error) => toast.error(error.message),
						},
					);
				}}
			/>

			<SupplierDialog
				open={showSupplierDialog}
				onOpenChange={setShowSupplierDialog}
				eventId={eventId}
				isPending={setSupplier.isPending}
				onSubmit={(supplierId) => {
					setSupplier.mutate(
						{ eventId, supplierId },
						{
							onSuccess: () => {
								toast.success("Fornecedor associado ao plano");
								setShowSupplierDialog(false);
							},
							onError: (error) => toast.error(error.message),
						},
					);
				}}
			/>

			<NotesDialog
				key={plan?.id ?? "plan-loading"}
				open={showNotesDialog}
				onOpenChange={setShowNotesDialog}
				initialNotes={plan?.notes ?? ""}
				isPending={updateNotes.isPending}
				onSubmit={(notes) => {
					updateNotes.mutate(
						{ eventId, notes: notes || undefined },
						{
							onSuccess: () => {
								toast.success("Notas atualizadas");
								setShowNotesDialog(false);
							},
							onError: (error) => toast.error(error.message),
						},
					);
				}}
			/>

			<ConfirmDeleteDialog
				open={deletingItem !== null}
				onOpenChange={(open) => {
					if (!open) setDeletingItem(null);
				}}
				itemTitle={deletingItem?.name ?? ""}
				isPending={deleteItem.isPending}
				onConfirm={() => {
					if (!deletingItem) return;
					deleteItem.mutate(
						{ id: deletingItem.id, eventId },
						{
							onSuccess: () => {
								toast.success("Item eliminado");
								setDeletingItem(null);
							},
							onError: (error) => toast.error(error.message),
						},
					);
				}}
			/>
		</div>
	);
}

// ========================
// Item dialog
// ========================
type FoodPlanItemFormValues = {
	name: string;
	category: FoodPlanCategoryValue;
	quantity: number;
	unit: FoodPlanUnitValue;
	description: string;
	notes: string;
	status: FoodPlanStatusValue;
};

function FoodPlanItemDialog({
	open,
	onOpenChange,
	editingItem,
	isPending,
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingItem: FoodPlanItemRow | null;
	isPending: boolean;
	onSubmit: (values: FoodPlanItemFormValues) => void;
}) {
	const isEditing = editingItem !== null;

	const form = useForm({
		defaultValues: {
			name: editingItem?.name ?? "",
			category:
				(editingItem?.category as FoodPlanCategoryValue) ?? "MAIN_COURSE",
			quantity: editingItem?.quantity ?? 1,
			unit: (editingItem?.unit as FoodPlanUnitValue) ?? "PORTION",
			description: editingItem?.description ?? "",
			notes: editingItem?.notes ?? "",
			status: (editingItem?.status as FoodPlanStatusValue) ?? "PENDING",
		},
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar item" : "Novo item do plano"}
					</DialogTitle>
					<DialogDescription>
						O plano não tem preços: o valor do catering fica no fornecedor
						associado.
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
								<Label htmlFor="food-plan-name">Nome</Label>
								<Input
									id="food-plan-name"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Ex.: Cabrito assado"
									disabled={isPending}
									required
								/>
							</div>
						)}
					</form.Field>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.Field name="category">
							{(field) => (
								<div className="space-y-2">
									<Label>Categoria</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as FoodPlanCategoryValue)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{toSelectItems(FOOD_PLAN_CATEGORY_LABELS).map(
												(option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
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
									<Label>Estado</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as FoodPlanStatusValue)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{toSelectItems(FOOD_PLAN_STATUS_LABELS).map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.Field name="quantity">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="food-plan-quantity">Quantidade</Label>
									<Input
										id="food-plan-quantity"
										type="number"
										min={0}
										step="any"
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(
												e.target.value === "" ? 0 : Number(e.target.value),
											)
										}
										disabled={isPending}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="unit">
							{(field) => (
								<div className="space-y-2">
									<Label>Unidade</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as FoodPlanUnitValue)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{toSelectItems(FOOD_PLAN_UNIT_LABELS).map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="food-plan-description">Descrição</Label>
								<Textarea
									id="food-plan-description"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Detalhes do item (opcional)"
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="notes">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="food-plan-notes">Notas</Label>
								<Textarea
									id="food-plan-notes"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Observações (opcional)"
									disabled={isPending}
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
						<Button type="submit" disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...
								</>
							) : isEditing ? (
								"Guardar"
							) : (
								"Adicionar"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ========================
// Supplier dialog
// ========================
function SupplierDialog({
	open,
	onOpenChange,
	eventId,
	isPending,
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	isPending: boolean;
	onSubmit: (supplierId: string) => void;
}) {
	const suppliersQuery = useSuppliers(eventId, { page: 1, limit: 100 });
	const suppliers = suppliersQuery.data?.data ?? [];
	const cateringSuppliers = suppliers.filter((s) => s.category === "CATERING");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Associar fornecedor</DialogTitle>
					<DialogDescription>
						O plano suporta um único fornecedor — normalmente o catering. Depois
						de associado, só pode ser removido, não trocado.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<QueryState
						state={{
							isLoading: suppliersQuery.isLoading,
							isError: suppliersQuery.isError,
							isEmpty: cateringSuppliers.length === 0,
							hasData: cateringSuppliers.length > 0,
						}}
					>
						<div className="space-y-2">
							<Label>Fornecedores de catering</Label>
							{cateringSuppliers.map((supplier) => (
								<button
									type="button"
									key={supplier.id}
									onClick={() => onSubmit(supplier.id)}
									disabled={isPending}
									className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
								>
									<span className="font-medium text-sm">{supplier.name}</span>
									<Badge variant="outline">{supplier.status}</Badge>
								</button>
							))}
						</div>
					</QueryState>
					{cateringSuppliers.length === 0 && !suppliersQuery.isLoading && (
						<p className="text-muted-foreground text-sm">
							Sem fornecedores de catering.{" "}
							<Link
								to="/events/$eventId/suppliers"
								params={{ eventId }}
								className="underline"
							>
								Criar fornecedor
							</Link>
						</p>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ========================
// Notes dialog
// ========================
function NotesDialog({
	open,
	onOpenChange,
	initialNotes,
	isPending,
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialNotes: string;
	isPending: boolean;
	onSubmit: (notes: string) => void;
}) {
	const [notes, setNotes] = useState(initialNotes);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Notas do plano</DialogTitle>
					<DialogDescription>
						Observações gerais sobre a alimentação do evento.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<Textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Ex.: Preferência por pratos tradicionais angolanos"
						rows={5}
						disabled={isPending}
					/>{" "}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button onClick={() => onSubmit(notes)} disabled={isPending}>
							{isPending ? "A guardar..." : "Guardar"}
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ========================
// Delete confirm
// ========================
function ConfirmDeleteDialog({
	open,
	onOpenChange,
	itemTitle,
	isPending,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	itemTitle: string;
	isPending: boolean;
	onConfirm: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Eliminar item</DialogTitle>
					<DialogDescription>
						Tem a certeza de que pretende eliminar "{itemTitle}"? Esta ação não
						pode ser revertida.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						onClick={onConfirm}
						disabled={isPending}
					>
						{isPending ? "A eliminar..." : "Eliminar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
