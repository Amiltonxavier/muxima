import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	CalendarDays,
	CheckCircle2,
	Circle,
	ListChecks,
	Loader2,
	Pencil,
	Plus,
	RefreshCw,
	Trash2,
	Wand2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { MetricProgressCard, StatsGrid } from "@/shared/components/metrics";
import { QueryState } from "@/shared/components/states";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import {
	type ChecklistItemFilters,
	type ChecklistStatusValue,
	useChecklist,
	useChecklistStats,
	useCreateChecklistItem,
	useDeleteChecklistItem,
	useSyncChecklist,
	useUpdateChecklistItem,
} from "@/shared/queries/checklist-queries";
import { inventoryKeys } from "@/shared/queries/inventory-queries";
import { supplierKeys } from "@/shared/queries/supplier-queries";
import { dateHelper } from "@/shared/utils/date-helper";
import { orpc } from "@/utils/orpc";
import {
	CHECKLIST_STATUS_LABELS,
	getStatusColor,
	getStatusLabel,
	toSelectItems,
} from "@/utils/status-helpers";

export const Route = createFileRoute("/_private/events/$eventId/checklist/")({
	component: ChecklistPage,
});

type ChecklistRow = {
	id: string;
	title: string;
	description: string | null;
	status: string;
	dueDate: string | Date | null;
	completedAt: string | Date | null;
	autoManaged: boolean;
	supplierId: string | null;
	inventoryItemId: string | null;
	supplier?: {
		id: string;
		name: string;
		category: string;
		status: string;
		paymentStatus: string;
	} | null;
	inventoryItem?: {
		id: string;
		name: string;
		status: string;
		plannedQuantity: unknown;
		currentQuantity: unknown;
	} | null;
};

/**
 * O checklist é uma lista de controlo do evento. Itens ligados a um
 * fornecedor ou a um item de inventário são geridos pela API — o estado é
 * derivado no backend e o frontend só o apresenta. Itens manuais podem ser
 * concluídos aqui.
 */
function ChecklistPage() {
	const { eventId } = Route.useParams();

	const [statusFilter, setStatusFilter] =
		useState<ChecklistItemFilters["status"]>(undefined);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ChecklistRow | null>(null);
	const [deletingItem, setDeletingItem] = useState<ChecklistRow | null>(null);

	const itemsQuery = useChecklist(eventId, { status: statusFilter });
	const statsQuery = useChecklistStats(eventId);
	const createItem = useCreateChecklistItem();
	const updateItem = useUpdateChecklistItem();
	const deleteItem = useDeleteChecklistItem();
	const syncChecklist = useSyncChecklist();

	const items = (itemsQuery.data ?? []) as ChecklistRow[];
	const stats = statsQuery.data;

	const handleToggle = (item: ChecklistRow) => {
		const nextStatus: ChecklistStatusValue =
			item.status === "COMPLETED" ? "PENDING" : "COMPLETED";
		updateItem.mutate(
			{ id: item.id, eventId, status: nextStatus },
			{
				onError: (error) => toast.error(error.message),
			},
		);
	};

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-semibold text-2xl">Checklist</h1>
					<p className="text-muted-foreground text-sm">
						Itens ligados a fornecedores e inventário são atualizados
						automaticamente pela API.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={() =>
							syncChecklist.mutate(
								{ eventId },
								{
									onSuccess: () => toast.success("Checklist sincronizado"),
									onError: (error) => toast.error(error.message),
								},
							)
						}
						disabled={syncChecklist.isPending}
					>
						<RefreshCw
							className={`mr-2 h-4 w-4 ${syncChecklist.isPending ? "animate-spin" : ""}`}
						/>
						Sincronizar
					</Button>
					<Button
						onClick={() => {
							setEditingItem(null);
							setDialogOpen(true);
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
					<MetricProgressCard
						title="Progresso"
						value={stats?.completed ?? 0}
						limit={stats?.total ?? 0}
						percentage={stats?.completionPercentage}
						label={`${stats?.completionPercentage ?? 0}%`}
						icon={<ListChecks className="h-4 w-4" />}
					/>
					<StatsCard
						title="Concluídos"
						value={stats?.completed ?? 0}
						description={
							(stats?.autoManaged ?? 0) > 0
								? `${stats?.autoManaged} automáticos`
								: undefined
						}
						icon={<CheckCircle2 className="h-4 w-4" />}
					/>
					<StatsCard
						title="Pendentes"
						value={(stats?.pending ?? 0) + (stats?.inProgress ?? 0)}
						description={
							(stats?.overdue ?? 0) > 0
								? `${stats?.overdue} em atraso`
								: undefined
						}
						icon={<Circle className="h-4 w-4" />}
					/>
					<StatsCard
						title="Alimentação"
						value={`${stats?.foodPlan.completionPercentage ?? 0}%`}
						description={`${stats?.foodPlan.completedItems ?? 0} de ${stats?.foodPlan.totalItems ?? 0} itens`}
						icon={<Wand2 className="h-4 w-4" />}
					/>
				</StatsGrid>
			)}

			<div className="flex items-center gap-2">
				<Select
					value={statusFilter ?? "todos"}
					onValueChange={(v) =>
						setStatusFilter(
							v === "todos" ? undefined : (v as ChecklistStatusValue),
						)
					}
				>
					<SelectTrigger className="w-48">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="todos">Todos os estados</SelectItem>
						{toSelectItems(CHECKLIST_STATUS_LABELS).map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<QueryState
				state={{
					isLoading: itemsQuery.isLoading,
					isError: itemsQuery.isError,
					isEmpty: items.length === 0,
					hasData: items.length > 0,
				}}
			>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Itens</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{items.map((item) => {
							const isCompleted = item.status === "COMPLETED";
							const isCancelled = item.status === "CANCELLED";
							const canToggle =
								!item.autoManaged && !isCancelled && !itemsQuery.isLoading;
							const isOverdue =
								item.dueDate !== null &&
								!isCompleted &&
								!isCancelled &&
								dateHelper.isPast(item.dueDate);

							return (
								<div
									key={item.id}
									className="flex items-start gap-3 rounded-md border p-3"
								>
									<Checkbox
										checked={isCompleted}
										disabled={!canToggle || updateItem.isPending}
										onCheckedChange={() => handleToggle(item)}
										className="mt-0.5"
										aria-label={`Marcar "${item.title}" como ${isCompleted ? "pendente" : "concluído"}`}
									/>
									<div className="min-w-0 flex-1 space-y-1">
										<div className="flex flex-wrap items-center gap-2">
											<span
												className={`font-medium text-sm ${isCompleted || isCancelled ? "text-muted-foreground line-through" : ""}`}
											>
												{item.title}
											</span>
											<Badge
												variant="outline"
												className={getStatusColor(item.status)}
											>
												{getStatusLabel(item.status, "checklist")}
											</Badge>
											{item.autoManaged && (
												<Badge variant="secondary">Automático</Badge>
											)}
											{isOverdue && (
												<Badge className="bg-red-50 text-red-700">
													Em atraso
												</Badge>
											)}
										</div>
										{item.description && (
											<p className="text-muted-foreground text-sm">
												{item.description}
											</p>
										)}
										<div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
											{item.dueDate && (
												<span className="inline-flex items-center gap-1">
													<CalendarDays className="h-3 w-3" />
													{dateHelper.formatMedium(item.dueDate)}
												</span>
											)}
											{item.supplier && (
												<span>Fornecedor: {item.supplier.name}</span>
											)}
											{item.inventoryItem && (
												<span>Inventário: {item.inventoryItem.name}</span>
											)}
										</div>
									</div>
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											onClick={() => {
												setEditingItem(item);
												setDialogOpen(true);
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
								</div>
							);
						})}
					</CardContent>
				</Card>
			</QueryState>

			<ChecklistItemDialog
				key={editingItem?.id ?? "new"}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				eventId={eventId}
				editingItem={editingItem}
				isPending={createItem.isPending || updateItem.isPending}
				onSubmit={(values) => {
					if (editingItem) {
						updateItem.mutate(
							{
								id: editingItem.id,
								eventId,
								title: values.title,
								description: values.description || null,
								dueDate: values.dueDate || null,
								// Estado só é enviado para itens manuais: o backend
								// recusa estado em itens auto-geridos.
								status:
									editingItem.autoManaged && values.status
										? undefined
										: values.status,
							},
							{
								onSuccess: () => {
									toast.success("Item atualizado");
									setDialogOpen(false);
								},
								onError: (error) => toast.error(error.message),
							},
						);
						return;
					}
					createItem.mutate(
						{
							eventId,
							title: values.title,
							description: values.description || undefined,
							dueDate: values.dueDate || undefined,
							supplierId:
								values.linkType === "SUPPLIER" ? values.linkId : undefined,
							inventoryItemId:
								values.linkType === "INVENTORY" ? values.linkId : undefined,
						},
						{
							onSuccess: () => {
								toast.success("Item criado");
								setDialogOpen(false);
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
				itemTitle={deletingItem?.title ?? ""}
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
// Create / Edit dialog
// ========================
type LinkType = "NONE" | "SUPPLIER" | "INVENTORY";

type ChecklistItemFormValues = {
	title: string;
	description: string;
	dueDate: string;
	status: ChecklistStatusValue;
	linkType: LinkType;
	linkId: string;
};

function ChecklistItemDialog({
	open,
	onOpenChange,
	eventId,
	editingItem,
	isPending,
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	editingItem: ChecklistRow | null;
	isPending: boolean;
	onSubmit: (values: ChecklistItemFormValues) => void;
}) {
	const isEditing = editingItem !== null;
	const isAutoManaged = editingItem?.autoManaged ?? false;

	const form = useForm({
		defaultValues: {
			title: editingItem?.title ?? "",
			description: editingItem?.description ?? "",
			dueDate: editingItem?.dueDate
				? dateHelper.formatToIsoDate(editingItem.dueDate)
				: "",
			status:
				(editingItem?.status as ChecklistStatusValue | undefined) ?? "PENDING",
			linkType: (editingItem?.supplierId
				? "SUPPLIER"
				: editingItem?.inventoryItemId
					? "INVENTORY"
					: "NONE") as LinkType,
			linkId: editingItem?.supplierId ?? editingItem?.inventoryItemId ?? "",
		},
		onSubmit: async ({ value }) => {
			onSubmit({
				title: value.title,
				description: value.description || undefined,
				dueDate: value.dueDate || undefined,
				status: value.status,
				linkType: value.linkType,
				linkId: value.linkId || "",
			} as ChecklistItemFormValues);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar item" : "Novo item do checklist"}
					</DialogTitle>
					<DialogDescription>
						{isAutoManaged
							? "Este item é gerido pela API a partir do fornecedor ou do inventário. O estado não pode ser alterado manualmente."
							: "Itens manuais podem ser concluídos aqui. Itens ligados a fornecedor ou inventário passam a ser atualizados automaticamente."}
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
					<form.Field name="title">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="checklist-title">Título</Label>
								<Input
									id="checklist-title"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Ex.: Confirmar prova do menu"
									disabled={isPending}
									required
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="checklist-description">Descrição</Label>
								<Textarea
									id="checklist-description"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Detalhes opcionais"
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.Field name="dueDate">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="checklist-due-date">Data limite</Label>
									<Input
										id="checklist-due-date"
										type="date"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isPending}
									/>
								</div>
							)}
						</form.Field>

						{!isAutoManaged && (
							<form.Field name="status">
								{(field) => (
									<div className="space-y-2">
										<Label>Estado</Label>
										<Select
											value={field.state.value}
											onValueChange={(v) =>
												field.handleChange(v as ChecklistStatusValue)
											}
										>
											{" "}
											<SelectTrigger>
												<SelectValue placeholder="Escolher..." />
											</SelectTrigger>
											<SelectContent>
												{toSelectItems(CHECKLIST_STATUS_LABELS).map(
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
						)}
					</div>

					{!isEditing && (
						<div className="space-y-2">
							<Label>Associação (opcional)</Label>
							<div className="grid gap-2 sm:grid-cols-2">
								<form.Field name="linkType">
									{(field) => (
										<Select
											value={field.state.value}
											onValueChange={(v) => field.handleChange(v as LinkType)}
										>
											{" "}
											<SelectTrigger>
												<SelectValue placeholder="Escolher..." />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="NONE">Sem associação</SelectItem>
												<SelectItem value="SUPPLIER">Fornecedor</SelectItem>
												<SelectItem value="INVENTORY">Inventário</SelectItem>
											</SelectContent>
										</Select>
									)}
								</form.Field>
								<form.Field name="linkId">
									{(linkIdField) => (
										<form.Subscribe selector={(s) => s.values.linkType}>
											{(linkType) =>
												linkType !== "NONE" ? (
													<LinkedEntitySelect
														value={linkIdField.state.value}
														onChange={linkIdField.handleChange}
														eventId={eventId}
														linkType={linkType}
													/>
												) : null
											}
										</form.Subscribe>
									)}
								</form.Field>
							</div>
							<p className="text-muted-foreground text-xs">
								Um item pode estar associado a um fornecedor ou a um item de
								inventário, nunca a ambos.
							</p>
						</div>
					)}

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
								"Criar"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

/** Escolhe o fornecedor ou o item de inventário do mesmo evento. */
function LinkedEntitySelect({
	value,
	onChange,
	eventId,
	linkType,
}: {
	value: string;
	onChange: (value: string) => void;
	eventId: string;
	linkType: "SUPPLIER" | "INVENTORY";
}) {
	const suppliersQuery = useQuery({
		...orpc.suppliers.list.queryOptions({
			input: { eventId, page: 1, limit: 100 },
		}),
		queryKey: supplierKeys.list(eventId, { eventId, page: 1, limit: 100 }),
		enabled: linkType === "SUPPLIER",
	});
	const inventoryQuery = useQuery({
		...orpc.inventory.list.queryOptions({
			input: { eventId, page: 1, limit: 100 },
		}),
		queryKey: inventoryKeys.list(eventId, { eventId, page: 1, limit: 100 }),
		enabled: linkType === "INVENTORY",
	});

	if (linkType === "SUPPLIER") {
		const suppliers = suppliersQuery.data?.data ?? [];
		return (
			<Select
				value={value || undefined}
				onValueChange={(v) => onChange(v ?? "")}
			>
				<SelectTrigger>
					<SelectValue placeholder="Escolher fornecedor" />
				</SelectTrigger>
				<SelectContent>
					{suppliers.map((supplier) => (
						<SelectItem key={supplier.id} value={supplier.id}>
							{supplier.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	const inventoryItems = inventoryQuery.data?.data ?? [];
	return (
		<Select value={value || undefined} onValueChange={(v) => onChange(v ?? "")}>
			<SelectTrigger>
				<SelectValue placeholder="Escolher item de inventário" />
			</SelectTrigger>
			<SelectContent>
				{inventoryItems.map((item) => (
					<SelectItem key={item.id} value={item.id}>
						{item.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
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
