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
import { StatusBadge } from "@muxima/ui/components/kibo-ui/status";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import {
	Cake,
	Eye,
	Pencil,
	Package,
	Plus,
	Search,
	Trash2,
	ArrowDownCircle,
	ArrowUpCircle,
	RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import { StatsCard } from "@/shared/components/stats-card/stats-card";
import {
	useAddInventoryMovement,
	useCreateInventoryItem,
	useDeleteInventoryItem,
	useInventoryItems,
	useUpdateInventoryItem,
} from "@/shared/queries/inventory-queries";
import { inventoryItemSchema, inventoryMovementSchema } from "@/utils/inventory-schemas";
import { formatCurrency } from "@/utils/format-currency";
import { formatDate } from "@/utils/format-date";
import {
	CAKE_TYPE_LABELS,
	INVENTORY_CATEGORY_LABELS,
	INVENTORY_UNIT_LABELS,
	MOVEMENT_TYPE_LABELS,
} from "@/utils/status-helpers";

export const Route = createFileRoute("/_private/events/$eventId/inventory/")({
	component: InventoryPage,
});

// ── Constants ────────────────────────────────────────────────────

const CATEGORY_BADGE_COLORS: Record<string, string> = {
	DRINK: "bg-blue-50 text-blue-700",
	FOOD: "bg-amber-50 text-amber-700",
	CAKE: "bg-pink-50 text-pink-700",
	DECORATION: "bg-purple-50 text-purple-700",
	OTHER: "bg-neutral-100 text-neutral-700",
};

const MOVEMENT_ICONS: Record<string, React.ReactNode> = {
	PURCHASE: <ArrowUpCircle className="h-4 w-4 text-green-500" />,
	ADD: <ArrowUpCircle className="h-4 w-4 text-blue-500" />,
	CONSUMPTION: <ArrowDownCircle className="h-4 w-4 text-amber-500" />,
	ADJUSTMENT: <RefreshCw className="h-4 w-4 text-purple-500" />,
	LOSS: <ArrowDownCircle className="h-4 w-4 text-red-500" />,
	RETURN: <ArrowUpCircle className="h-4 w-4 text-emerald-500" />,
};

const MOVEMENT_TYPE_OPTIONS = [
	{ value: "PURCHASE", label: "Compra" },
	{ value: "ADD", label: "Adição" },
	{ value: "CONSUMPTION", label: "Consumo" },
	{ value: "ADJUSTMENT", label: "Ajuste" },
	{ value: "LOSS", label: "Perda" },
	{ value: "RETURN", label: "Devolução" },
];

// ── Main Page ────────────────────────────────────────────────────

function InventoryPage() {
	const { eventId } = Route.useParams();

	const itemsQuery = useInventoryItems(eventId);
	const createItem = useCreateInventoryItem();
	const updateItem = useUpdateInventoryItem();
	const deleteItem = useDeleteInventoryItem();
	const addMovement = useAddInventoryMovement();

	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("ALL");
	const [stockFilter, setStockFilter] = useState("ALL");
	const [showCreate, setShowCreate] = useState(false);
	const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
	const [viewingItem, setViewingItem] = useState<Record<string, unknown> | null>(null);
	const [movementItem, setMovementItem] = useState<Record<string, unknown> | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const items = (itemsQuery.data ?? []) as Record<string, unknown>[];

	const filteredItems = items.filter((item) => {
		const q = search.toLowerCase();
		const matchesSearch =
			!q ||
			(item.name as string)?.toLowerCase().includes(q) ||
			(item.category as string)?.toLowerCase().includes(q) ||
			(item.notes as string)?.toLowerCase().includes(q);

		const matchesCategory =
			categoryFilter === "ALL" || item.category === categoryFilter;

		const planned = Number(item.plannedQuantity) || 0;
		const current = Number(item.currentQuantity) || 0;
		const percent = planned > 0 ? (current / planned) * 100 : 100;
		const matchesStock =
			stockFilter === "ALL" ||
			(stockFilter === "LOW" && percent < 50) ||
			(stockFilter === "OK" && percent >= 50 && percent < 100) ||
			(stockFilter === "FULL" && percent >= 100);

		return matchesSearch && matchesCategory && matchesStock;
	});

	// ── Metrics ──────────────────────────────────────────────────

	const totalPlanned = items.reduce((sum, i) => sum + (Number(i.plannedQuantity) || 0), 0);
	const totalCurrent = items.reduce((sum, i) => sum + (Number(i.currentQuantity) || 0), 0);
	const totalValue = items.reduce(
		(sum, i) => sum + (Number(i.currentQuantity) || 0) * (Number(i.unitPrice) || 0),
		0,
	);
	const lowStockCount = items.filter((i) => {
		const planned = Number(i.plannedQuantity) || 0;
		const current = Number(i.currentQuantity) || 0;
		return planned > 0 && current < planned * 0.5;
	}).length;

	// ── Beverage Planning ────────────────────────────────────────

	const drinkItems = items.filter((i) => i.category === "DRINK");
	const totalPlannedDrinks = drinkItems.reduce(
		(sum, i) => sum + (Number(i.plannedQuantity) || 0),
		0,
	);
	const totalCurrentDrinks = drinkItems.reduce(
		(sum, i) => sum + (Number(i.currentQuantity) || 0),
		0,
	);

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Inventário</h1>
					<p className="text-muted-foreground text-sm">
						{filteredItems.length} de {items.length} itens
					</p>
				</div>
				<Button onClick={() => setShowCreate(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar item
				</Button>
			</div>

			{/* ── Stats ──────────────────────────────────────────── */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatsCard title="Total planeado" value={totalPlanned} description="itens" />
				<StatsCard title="Em stock" value={totalCurrent} description="itens" />
				<StatsCard title="Valor total" value={formatCurrency(totalValue)} />
				<StatsCard
					title="Stock baixo"
					value={lowStockCount}
					description={lowStockCount > 0 ? "⚠️" : "itens"}
				/>
			</div>

			{/* ── Beverage Planning ──────────────────────────────── */}
			{drinkItems.length > 0 && (
				<div className="rounded-md border border-dashed p-4">
					<div className="mb-3 flex items-center gap-2">
						<Package className="h-4 w-4 text-blue-500" />
						<h3 className="font-medium text-sm">Planeamento de Bebidas</h3>
					</div>
					<div className="grid gap-3 sm:grid-cols-3">
						<div>
							<p className="text-muted-foreground text-xs">Itens planeados</p>
							<p className="font-semibold text-lg">{drinkItems.length}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Quantidade total planeada</p>
							<p className="font-semibold text-lg">{totalPlannedDrinks}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">Quantidade total em stock</p>
							<p className="font-semibold text-lg">{totalCurrentDrinks}</p>
						</div>
					</div>
					<div className="mt-3 space-y-1">
						{drinkItems.map((item) => {
							const planned = Number(item.plannedQuantity) || 0;
							const current = Number(item.currentQuantity) || 0;
							const pct = planned > 0 ? Math.round((current / planned) * 100) : 0;
							return (
								<div key={item.id as string} className="flex items-center gap-3 text-xs">
									<span className="w-32 truncate font-medium">{item.name as string}</span>
									<Progress value={pct} className="h-1.5 flex-1" />
									<span className="tabular-nums text-muted-foreground">
										{current}/{planned} {INVENTORY_UNIT_LABELS[item.unit as string] || ""}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* ── Filters ─────────────────────────────────────────── */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="relative max-w-sm flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Pesquisar item..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "ALL")}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Categoria" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todas categorias</SelectItem>
						{Object.entries(INVENTORY_CATEGORY_LABELS).map(([k, l]) => (
							<SelectItem key={k} value={k}>{l}</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={stockFilter} onValueChange={(v) => setStockFilter(v ?? "ALL")}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Stock" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todo stock</SelectItem>
						<SelectItem value="LOW">Stock baixo</SelectItem>
						<SelectItem value="OK">Stock parcial</SelectItem>
						<SelectItem value="FULL">Stock completo</SelectItem>
					</SelectContent>
				</Select>
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
								<th className="h-10 px-4 text-left font-medium text-muted-foreground">Nome</th>
								<th className="h-10 px-4 text-left font-medium text-muted-foreground">Categoria</th>
								<th className="h-10 px-4 text-left font-medium text-muted-foreground">Unidade</th>
								<th className="h-10 px-4 text-right font-medium text-muted-foreground">Planeado</th>
								<th className="h-10 px-4 text-right font-medium text-muted-foreground">Atual</th>
								<th className="h-10 px-4 text-left font-medium text-muted-foreground">Progresso</th>
								<th className="h-10 px-4 text-right font-medium text-muted-foreground">Preço/unid.</th>
								<th className="h-10 px-4 text-right font-medium text-muted-foreground">Ações</th>
							</tr>
						</thead>
						<tbody>
							{filteredItems.map((item) => {
								const planned = Number(item.plannedQuantity) || 0;
								const current = Number(item.currentQuantity) || 0;
								const percent = planned > 0 ? Math.round((current / planned) * 100) : 0;
								const unitPrice = Number(item.unitPrice) || 0;

								return (
									<tr
										key={item.id as string}
										className="border-b transition-colors hover:bg-muted/50"
									>
										<td className="p-4">
											<div className="flex items-center gap-2">
												{item.category === "CAKE" && <Cake className="h-4 w-4 text-pink-400" />}
												<span className="font-medium">{item.name as string}</span>
											</div>
										</td>
										<td className="p-4">
											<Badge
												variant="secondary"
												className={CATEGORY_BADGE_COLORS[item.category as string] || ""}
											>
												{INVENTORY_CATEGORY_LABELS[item.category as string] || (item.category as string)}
											</Badge>
										</td>
										<td className="p-4 text-muted-foreground">
											{String(INVENTORY_UNIT_LABELS[item.unit as string] || item.unit || "")}
										</td>
										<td className="p-4 text-right tabular-nums">{planned}</td>
										<td className="p-4 text-right tabular-nums font-medium">{current}</td>
										<td className="p-4">
											<div className="flex items-center gap-2">
												<Progress value={percent} className="h-2 w-20" />
												<span className="text-muted-foreground text-xs tabular-nums">{percent}%</span>
											</div>
										</td>
										<td className="p-4 text-right tabular-nums">
											{unitPrice > 0 ? `${unitPrice.toLocaleString("pt-AO")} Kz` : "—"}
										</td>
										<td className="p-4 text-right">
											<div className="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setMovementItem(item)}
													title="Movimentar"
												>
													<RefreshCw className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setViewingItem(item)}
													title="Ver detalhes"
												>
													<Eye className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setEditingItem(item)}
													title="Editar"
												>
													<Pencil className="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													className="text-destructive"
													onClick={() => setDeleteId(item.id as string)}
													title="Eliminar"
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
						cakeType: (editingItem.cakeType as string) || "",
						weight: Number(editingItem.weight) || 0,
						deliveryDate: editingItem.deliveryDate
							? new Date(editingItem.deliveryDate as string).toISOString().split("T")[0]
							: "",
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

			{/* ── Movement Dialog ──────────────────────────────────── */}
			{movementItem && (
				<MovementDialog
					open={!!movementItem}
					onOpenChange={() => setMovementItem(null)}
					item={movementItem}
					onSubmit={(values) => {
						addMovement.mutate(
							{ inventoryItemId: movementItem.id as string, ...values },
							{
								onSuccess: () => {
									toast.success("Movimento registado");
									setMovementItem(null);
								},
								onError: (e) => toast.error(e.message),
							},
						);
					}}
					isLoading={addMovement.isPending}
				/>
			)}

			{/* ── View Detail Dialog ───────────────────────────────── */}
			{viewingItem && (
				<ViewDialog
					item={viewingItem}
					onClose={() => setViewingItem(null)}
					onEdit={() => {
						setEditingItem(viewingItem);
						setViewingItem(null);
					}}
				/>
			)}

			{/* ── Delete Dialog ────────────────────────────────────── */}
			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar item</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						Tem certeza que deseja eliminar este item do inventário? Esta ação não pode ser desfeita.
					</p>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
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

// ── Movement Dialog ──────────────────────────────────────────────

function MovementDialog({
	open,
	onOpenChange,
	item,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	item: Record<string, unknown>;
	onSubmit: (values: any) => void;
	isLoading: boolean;
}) {
	const currentQty = Number(item.currentQuantity) || 0;

	const form = useForm({
		defaultValues: {
			type: "CONSUMPTION" as any,
			quantity: 0,
			reason: "",
		},
		onSubmit: async ({ value }) => {
			const result = inventoryMovementSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}
			if (
				(value.type === "CONSUMPTION" || value.type === "LOSS") &&
				value.quantity > currentQty
			) {
				toast.error(`Quantidade máxima disponível: ${currentQty}`);
				return;
			}
			onSubmit(result.data);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Movimentar item</DialogTitle>
				</DialogHeader>
				<div className="mb-2 rounded-md bg-muted p-3 text-sm">
					<p className="font-medium">{item.name as string}</p>
					<p className="text-muted-foreground">
						Stock atual: <span className="font-medium tabular-nums">{currentQty}</span>{" "}
						{INVENTORY_UNIT_LABELS[item.unit as string] || ""}
					</p>
				</div>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="type">
						{(field) => (
							<div className="space-y-2">
								<Label>Tipo de movimento</Label>
								<Select
									items={MOVEMENT_TYPE_OPTIONS}
									value={field.state.value}
									onValueChange={(v) => field.handleChange(v as any)}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MOVEMENT_TYPE_OPTIONS.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</form.Field>
					<form.Field name="quantity">
						{(field) => (
							<div className="space-y-2">
								<Label>Quantidade</Label>
								<Input
									type="number"
									value={field.state.value || ""}
									onChange={(e) => field.handleChange(Number(e.target.value) || 0)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="reason">
						{(field) => (
							<div className="space-y-2">
								<Label>Motivo (opcional)</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Ex: Evento, Correção, etc."
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "A registar..." : "Registar movimento"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ── View Dialog ──────────────────────────────────────────────────

function ViewDialog({
	item,
	onClose,
	onEdit,
}: {
	item: Record<string, unknown>;
	onClose: () => void;
	onEdit: () => void;
}) {
	const planned = Number(item.plannedQuantity) || 0;
	const current = Number(item.currentQuantity) || 0;
	const percent = planned > 0 ? Math.round((current / planned) * 100) : 0;
	const unitPrice = Number(item.unitPrice) || 0;
	const movements = (item.movements as Record<string, unknown>[]) ?? [];

	return (
		<Dialog open onOpenChange={() => onClose()}>
			<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{item.name as string}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="flex items-center gap-2">
					<Badge variant="secondary" className={CATEGORY_BADGE_COLORS[item.category as string] || ""}>
						{String(INVENTORY_CATEGORY_LABELS[item.category as string] || item.category || "")}
					</Badge>
						{!!item.cakeType && (
							<Badge variant="outline">
								{String(CAKE_TYPE_LABELS[item.cakeType as string] || item.cakeType || "")}
							</Badge>
						)}
					</div>

					<div className="grid grid-cols-2 gap-3 text-sm">
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Unidade</p>
							<p className="font-medium">
								{INVENTORY_UNIT_LABELS[item.unit as string] || (item.unit as string)}
							</p>
						</div>
						<div className="rounded border p-3">
							<p className="text-muted-foreground text-xs">Preço por unidade</p>
							<p className="font-medium">
								{unitPrice > 0 ? `${unitPrice.toLocaleString("pt-AO")} Kz` : "Não definido"}
							</p>
						</div>							{!!item.weight && Number(item.weight) > 0 && (
							<div className="rounded border p-3">
								<p className="text-muted-foreground text-xs">Peso</p>
								<p className="font-medium">									{String(Number(item.weight))} kg</p>
							</div>
						)}
						{!!item.deliveryDate && (
							<div className="rounded border p-3">
								<p className="text-muted-foreground text-xs">Data de entrega</p>
								<p className="font-medium">{formatDate(item.deliveryDate as string)}</p>
							</div>
						)}
					</div>

					<div className="rounded border p-3">
						<div className="mb-1 flex items-center justify-between text-sm">
							<span className="text-muted-foreground">
								Planeado: {planned} {INVENTORY_UNIT_LABELS[item.unit as string] || ""}
							</span>
							<span>Atual: {current}</span>
						</div>
						<Progress value={percent} />
						<p className="mt-1 text-muted-foreground text-xs">{percent}% concluído</p>
					</div>

					{unitPrice > 0 && (
						<div className="rounded-md bg-muted p-3 text-sm">
							<p className="text-muted-foreground">Valor total</p>
							<p className="font-semibold text-lg">
								{formatCurrency(current * unitPrice)}
							</p>
						</div>
					)}						{!!item.notes && (
						<div>
							<p className="text-muted-foreground text-sm">Notas</p>
							<p className="text-sm">{item.notes as string}</p>
						</div>
					)}

					{/* Movement History */}
					<div className="space-y-2">
						<p className="font-medium text-sm">Histórico de movimentos ({movements.length})</p>
						{movements.length === 0 ? (
							<p className="py-4 text-center text-muted-foreground text-xs">
								Nenhum movimento registado
							</p>
						) : (
							<div className="space-y-1">
								{movements.map((m) => (
									<div
										key={m.id as string}
										className="flex items-center justify-between rounded-md border p-2.5 text-xs"
									>
										<div className="flex items-center gap-2">
											{MOVEMENT_ICONS[m.type as string]}
											<div>
												<Badge variant="outline">														{String(MOVEMENT_TYPE_LABELS[m.type as string] || m.type || "")}
												</Badge>
												{!!m.reason && (
													<span className="ml-2 text-muted-foreground">{m.reason as string}</span>
												)}
											</div>
										</div>
										<div className="text-right">
											<span className="tabular-nums font-medium">
												{m.type === "CONSUMPTION" || m.type === "LOSS" ? "-" : "+"}
												{String(m.quantity)}
											</span>
											<p className="text-muted-foreground">
												{m.createdAt ? formatDate(m.createdAt as string) : ""}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>Fechar</Button>
					<Button onClick={onEdit}>
						<Pencil className="mr-2 h-4 w-4" />
						Editar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
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
		cakeType?: string;
		weight?: number;
		deliveryDate?: string;
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
			cakeType: (initialValues?.cakeType || "") as any,
			weight: initialValues?.weight || 0,
			deliveryDate: initialValues?.deliveryDate || "",
			notes: initialValues?.notes || "",
		},
		onSubmit: async ({ value }) => {
			const r = inventoryItemSchema.safeParse(value);
			if (!r.success) {
				toast.error(r.error.issues[0].message);
				return;
			}
			onSubmit({
				...r.data,
				cakeType: value.cakeType || undefined,
				weight: value.weight || undefined,
				deliveryDate: value.deliveryDate || undefined,
			});
		},
	});

	const [selectedCategory, setSelectedCategory] = useState(initialValues?.category || "DRINK");

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
											{Object.entries(INVENTORY_CATEGORY_LABELS).map(([k, l]) => (
												<SelectItem key={k} value={k}>{l}</SelectItem>
											))}
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
												<SelectItem key={k} value={k}>{l}</SelectItem>
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
										onChange={(e) => field.handleChange(Number(e.target.value) || 0)}
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
										onChange={(e) => field.handleChange(Number(e.target.value) || 0)}
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
										onChange={(e) => field.handleChange(Number(e.target.value) || 0)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					)}

					{/* ── Cake-specific fields ─────────────────────── */}
					<div className="rounded-md border border-dashed p-4 space-y-4">
						<div className="flex items-center gap-2">
							<Cake className="h-4 w-4 text-pink-400" />
							<span className="font-medium text-sm">Campos de bolo (opcional)</span>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<form.Field name="cakeType">
								{(field) => (
									<div className="space-y-2">
										<Label>Tipo de bolo</Label>
										<Select
											items={Object.entries(CAKE_TYPE_LABELS).map(
												([value, label]) => ({ value, label }),
											)}
											value={field.state.value}
											onValueChange={(v) => field.handleChange(v as any)}
										>
											<SelectTrigger>
												<SelectValue placeholder="Selecionar..." />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="">Nenhum</SelectItem>
												{Object.entries(CAKE_TYPE_LABELS).map(([k, l]) => (
													<SelectItem key={k} value={k}>{l}</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
							</form.Field>
							<form.Field name="weight">
								{(field) => (
									<div className="space-y-2">
										<Label>Peso (kg)</Label>
										<Input
											type="number"
											value={field.state.value || ""}
											onChange={(e) => field.handleChange(Number(e.target.value) || 0)}
											disabled={isLoading}
										/>
									</div>
								)}
							</form.Field>
						</div>
						<form.Field name="deliveryDate">
							{(field) => (
								<div className="space-y-2">
									<Label>Data de entrega</Label>
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
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
