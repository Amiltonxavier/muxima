import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Input } from "@muxima/ui/components/input";
import { Label } from "@muxima/ui/components/label";
import { Progress } from "@muxima/ui/components/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateInventoryItem,
	useDeleteInventoryItem,
	useInventoryItems,
	useUpdateInventoryItem,
} from "@/shared/queries/inventory-queries";
import { inventoryItemSchema } from "@/utils/inventory-schemas";
import {
	INVENTORY_CATEGORY_LABELS,
	INVENTORY_UNIT_LABELS,
} from "@/utils/status-helpers";

export const Route = createFileRoute("/_private/events/$eventId/inventory/")({
	component: InventoryPage,
});

// ── Status helpers ───────────────────────────────────────────────

const CATEGORY_BADGE_COLORS: Record<string, string> = {
	DRINK: "bg-blue-50 text-blue-700",
	FOOD: "bg-amber-50 text-amber-700",
	CAKE: "bg-pink-50 text-pink-700",
	DECORATION: "bg-purple-50 text-purple-700",
	OTHER: "bg-neutral-100 text-neutral-700",
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
	PURCHASE: "Compra",
	ADD: "Adição",
	CONSUMPTION: "Consumo",
	ADJUSTMENT: "Ajuste",
	LOSS: "Perda",
	RETURN: "Devolução",
};

// ── Main Page ────────────────────────────────────────────────────

function InventoryPage() {
	const { eventId } = Route.useParams();

	const itemsQuery = useInventoryItems(eventId);
	const createItem = useCreateInventoryItem();
	const updateItem = useUpdateInventoryItem();
	const deleteItem = useDeleteInventoryItem();

	const [search, setSearch] = useState("");
	const [showCreate, setShowCreate] = useState(false);
	const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
	const [viewingItem, setViewingItem] = useState<Record<string, unknown> | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const items = (itemsQuery.data ?? []) as Record<string, unknown>[];

	const filteredItems = items.filter((item) => {
		if (!search) return true;
		const q = search.toLowerCase();
		return (
			(item.name as string)?.toLowerCase().includes(q) ||
			(item.category as string)?.toLowerCase().includes(q) ||
			(item.notes as string)?.toLowerCase().includes(q)
		);
	});

	// ── Metrics ──────────────────────────────────────────────────

	const totalPlanned = items.reduce((sum, i) => sum + (Number(i.plannedQuantity) || 0), 0);
	const totalCurrent = items.reduce((sum, i) => sum + (Number(i.currentQuantity) || 0), 0);
	const totalValue = items.reduce(
		(sum, i) => sum + (Number(i.currentQuantity) || 0) * (Number(i.unitPrice) || 0),
		0,
	);
	const lowStockItems = items.filter((i) => {
		const planned = Number(i.plannedQuantity) || 0;
		const current = Number(i.currentQuantity) || 0;
		return planned > 0 && current < planned * 0.5;
	});

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Inventário</h1>
					<p className="text-muted-foreground text-sm">{items.length} itens</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar item
				</Button>
			</div>

			{/* ── Metrics ─────────────────────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<MetricCard label="Total planeado" value={totalPlanned} />
				<MetricCard label="Total em stock" value={totalCurrent} />
				<MetricCard
					label="Valor total"
					value={`${totalValue.toLocaleString("pt-AO")} Kz`}
				/>
				<MetricCard
					label="Stock baixo"
					value={lowStockItems.length}
					highlight={lowStockItems.length > 0}
				/>
			</div>

			{/* ── Search ──────────────────────────────────────────── */}
			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Pesquisar item..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="pl-9"
				/>
			</div>

			{/* ── Table ───────────────────────────────────────────── */}
			<QueryState
				state={{
					isLoading: itemsQuery.isLoading,
					isError: itemsQuery.isError,
					isEmpty: filteredItems.length === 0,
					hasData: filteredItems.length > 0,
				}}
			>
				<div className="rounded-md border">
					<table className="w-full caption-bottom text-sm">
						<thead className="border-b bg-muted/50">
							<tr>
								<th className="h-10 px-4 text-left font-medium text-muted-foreground">
									Nome
								</th>
								<th className="h-10 px-4 text-left font-medium text-muted-foreground">
									Categoria
								</th>
								<th className="h-10 px-4 text-left font-medium text-muted-foreground">
									Unidade
								</th>
								<th className="h-10 px-4 text-right font-medium text-muted-foreground">
									Planeado
								</th>
								<th className="h-10 px-4 text-right font-medium text-muted-foreground">
									Atual
								</th>
								<th className="h-10 px-4 text-left font-medium text-muted-foreground">
									Progresso
								</th>
								<th className="h-10 px-4 text-right font-medium text-muted-foreground">
									Preço/unid.
								</th>
								<th className="h-10 px-4 text-right font-medium text-muted-foreground">
									Ações
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredItems.map((item) => {
								const planned = Number(item.plannedQuantity) || 0;
								const current = Number(item.currentQuantity) || 0;
								const percent =
									planned > 0 ? Math.round((current / planned) * 100) : 0;
								const unitPrice = Number(item.unitPrice) || 0;

								return (
									<tr
										key={item.id as string}
										className="border-b transition-colors hover:bg-muted/50"
									>
										<td className="p-4 font-medium">{item.name as string}</td>
										<td className="p-4">
											<Badge
												variant="secondary"
												className={
													CATEGORY_BADGE_COLORS[item.category as string] || ""
												}
											>
												{INVENTORY_CATEGORY_LABELS[item.category as string] ||
													(item.category as string)}
											</Badge>
										</td>
										<td className="p-4 text-muted-foreground">
											{INVENTORY_UNIT_LABELS[item.unit as string] ||
												(item.unit as string)}
										</td>
										<td className="p-4 text-right tabular-nums">{planned}</td>
										<td className="p-4 text-right tabular-nums">{current}</td>
										<td className="p-4">
											<div className="flex items-center gap-2">
												<Progress value={percent} className="h-2 w-20" />
												<span className="text-muted-foreground text-xs tabular-nums">
													{percent}%
												</span>
											</div>
										</td>
										<td className="p-4 text-right tabular-nums">
											{unitPrice > 0
												? `${unitPrice.toLocaleString("pt-AO")} Kz`
												: "—"}
										</td>
										<td className="p-4 text-right">
											<div className="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setViewingItem(item)}
												>
													<Eye className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setEditingItem(item)}
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-destructive"
													onClick={() => setDeleteId(item.id as string)}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</Button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</QueryState>

			{/* ── Create Dialog ────────────────────────────────────── */}
			<InventoryDialog
				open={showCreate}
				onOpenChange={setShowCreate}
				onSubmit={(values) => {
					createItem.mutate(
						{ ...values, eventId },
						{
							onSuccess: () => {
								toast.success("Item adicionado");
								setShowCreate(false);
							},
							onError: (e) => toast.error(e.message),
						},
					);
				}}
				isLoading={createItem.isPending}
			/>

			{/* ── Edit Dialog ──────────────────────────────────────── */}
			{editingItem && (
				<InventoryDialog
					open={!!editingItem}
					onOpenChange={() => setEditingItem(null)}
					initialValues={{
						name: (editingItem.name as string) || "",
						category: (editingItem.category as string) || "OTHER",
						plannedQuantity: Number(editingItem.plannedQuantity) || 0,
						currentQuantity: Number(editingItem.currentQuantity) || 0,
						unit: (editingItem.unit as string) || "UNIT",
						unitPrice: Number(editingItem.unitPrice) || 0,
						notes: (editingItem.notes as string) || "",
					}}
					onSubmit={(values) => {
						updateItem.mutate(
							{ id: editingItem.id as string, ...values },
							{
								onSuccess: () => {
									toast.success("Item atualizado");
									setEditingItem(null);
								},
								onError: (e) => toast.error(e.message),
							},
						);
					}}
					isLoading={updateItem.isPending}
				/>
			)}

			{/* ── View Detail Dialog ───────────────────────────────── */}
			{viewingItem && (
				<Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
					<DialogContent className="max-w-lg">
						<DialogHeader>
							<DialogTitle>Detalhes do item</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="font-semibold text-lg">
									{viewingItem.name as string}
								</h3>
								<Badge
									variant="secondary"
									className={
										CATEGORY_BADGE_COLORS[viewingItem.category as string] || ""
									}
								>
									{INVENTORY_CATEGORY_LABELS[viewingItem.category as string] ||
										(viewingItem.category as string)}
								</Badge>
							</div>

							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p className="text-muted-foreground">Unidade</p>
									<p className="font-medium">
										{INVENTORY_UNIT_LABELS[viewingItem.unit as string] ||
											(viewingItem.unit as string)}
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Preço por unidade</p>
									<p className="font-medium">
										{Number(viewingItem.unitPrice) > 0
											? `${Number(viewingItem.unitPrice).toLocaleString("pt-AO")} Kz`
											: "Não definido"}
									</p>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">
										Planeado: {Number(viewingItem.plannedQuantity) || 0}{" "}
										{INVENTORY_UNIT_LABELS[viewingItem.unit as string] ||
											(viewingItem.unit as string)}
									</span>
									<span>
										Atual: {Number(viewingItem.currentQuantity) || 0}
									</span>
								</div>
								<Progress
									value={
										(Number(viewingItem.plannedQuantity) || 0) > 0
											? Math.round(
													((Number(viewingItem.currentQuantity) || 0) /
														(Number(viewingItem.plannedQuantity) || 0)) *
														100,
												)
											: 0
									}
								/>
							</div>

							{Number(viewingItem.unitPrice) > 0 && (
								<div className="rounded-md bg-muted p-3 text-sm">
									<p className="text-muted-foreground">Valor total</p>
									<p className="font-semibold text-lg">
										{(
											(Number(viewingItem.currentQuantity) || 0) *
											(Number(viewingItem.unitPrice) || 0)
										).toLocaleString("pt-AO")}{" "}
										Kz
									</p>
								</div>
							)}

							{(viewingItem.notes as string) && (
								<div>
									<p className="text-muted-foreground text-sm">Notas</p>
									<p className="text-sm">{viewingItem.notes as string}</p>
								</div>
							)}

							{/* Movements */}
							{Array.isArray(viewingItem.movements) &&
								(viewingItem.movements as Record<string, unknown>[]).length >
									0 && (
									<div className="space-y-2">
										<p className="font-medium text-sm">Últimos movimentos</p>
										<div className="space-y-1">
											{(viewingItem.movements as Record<string, unknown>[]).map(
												(m) => (
													<div
														key={m.id as string}
														className="flex items-center justify-between rounded-md border p-2 text-xs"
													>
														<div className="flex items-center gap-2">
															<Badge variant="outline">
																{MOVEMENT_TYPE_LABELS[m.type as string] ||
																	(m.type as string)}
															</Badge>
															<span>{m.reason as string}</span>
														</div>
														<span className="tabular-nums">
															{m.type === "CONSUMPTION" || m.type === "LOSS"
																? "-"
																: "+"}
															{String(m.quantity)}
														</span>
													</div>
												),
											)}
										</div>
									</div>
								)}
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setViewingItem(null)}>
								Fechar
							</Button>
							<Button
								onClick={() => {
									setEditingItem(viewingItem);
									setViewingItem(null);
								}}
							>
								<Pencil className="mr-2 h-4 w-4" />
								Editar
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			{/* ── Delete Dialog ────────────────────────────────────── */}
			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar item</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						Tem certeza que deseja eliminar este item do inventário? Esta ação não
						pode ser desfeita.
					</p>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteId(null)}>
							Cancelar
						</Button>
						<Button
							variant="destructive"
							onClick={() => {
								if (deleteId)
									deleteItem.mutate(
										{ id: deleteId },
										{
											onSuccess: () => {
												toast.success("Item eliminado");
												setDeleteId(null);
											},
											onError: (e) => toast.error(e.message),
										},
									);
							}}
							disabled={deleteItem.isPending}
						>
							Eliminar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// ── Metric Card ──────────────────────────────────────────────────

function MetricCard({
	label,
	value,
	highlight,
}: {
	label: string;
	value: string | number;
	highlight?: boolean;
}) {
	return (
		<div
			className={`rounded-md border p-4 ${
				highlight ? "border-red-200 bg-red-50" : ""
			}`}
		>
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className={`font-semibold text-2xl ${highlight ? "text-red-600" : ""}`}>
				{value}
			</p>
		</div>
	);
}

// ── Inventory Dialog (Create / Edit) ─────────────────────────────

function InventoryDialog({
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
		category: string;
		plannedQuantity: number;
		currentQuantity: number;
		unit: string;
		unitPrice: number;
		notes: string;
	};
	onSubmit: (v: any) => void;
	isLoading: boolean;
}) {
	const isEditing = !!initialValues;

	const form = useForm({
		defaultValues: {
			name: initialValues?.name || "",
			category: (initialValues?.category || "DRINK") as any,
			plannedQuantity: initialValues?.plannedQuantity || 0,
			currentQuantity: initialValues?.currentQuantity || 0,
			unit: (initialValues?.unit || "UNIT") as any,
			unitPrice: initialValues?.unitPrice || 0,
			notes: initialValues?.notes || "",
		},
		onSubmit: async ({ value }) => {
			const r = inventoryItemSchema.safeParse(value);
			if (!r.success) {
				toast.error(r.error.issues[0].message);
				return;
			}
			onSubmit(r.data);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar item" : "Adicionar item ao inventário"}
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
					<form.Field name="name">
						{(field) => (
							<div className="space-y-2">
								<Label>Nome</Label>
								<Input
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
						<form.Field name="unit">
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
											{Object.entries(INVENTORY_UNIT_LABELS).map(([k, l]) => (
												<SelectItem key={k} value={k}>
													{l}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="plannedQuantity">
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
						<form.Field name="unitPrice">
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
					{isEditing && (
						<form.Field name="currentQuantity">
							{(field) => (
								<div className="space-y-2">
									<Label>Quantidade atual</Label>
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
							{isLoading
								? "A guardar..."
								: isEditing
									? "Guardar"
									: "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
