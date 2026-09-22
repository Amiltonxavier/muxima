import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import {
	Dialog,
	DialogContent,
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
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BackButton } from "@/shared/components/back-to";
import { QueryState } from "@/shared/components/states";
import {
	useCreateInventoryItem,
	useDeleteInventoryItem,
	useInventoryItems,
} from "@/shared/queries/inventory-queries";
import { inventoryItemSchema } from "@/utils/inventory-schemas";
import {
	INVENTORY_CATEGORY_LABELS,
	INVENTORY_UNIT_LABELS,
} from "@/utils/status-helpers";

export const Route = createFileRoute("/_private/events/$eventId/inventory/")({
	component: InventoryPage,
});

function InventoryPage() {
	const { eventId } = Route.useParams();

	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);

	const itemsQuery = useInventoryItems(eventId, { page, limit });
	const createItem = useCreateInventoryItem();
	const deleteItem = useDeleteInventoryItem();

	const [showCreate, setShowCreate] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const items = itemsQuery.data?.data ?? [];
	const meta = itemsQuery.data?.meta;

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

			<QueryState
				state={{
					isLoading: itemsQuery.isLoading,
					isError: itemsQuery.isError,
					isEmpty: items.length === 0,
					hasData: items.length > 0,
				}}
			>
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nome</TableHead>
								<TableHead>Categoria</TableHead>
								<TableHead>Unidade</TableHead>
								<TableHead>Planeado</TableHead>
								<TableHead>Atual</TableHead>
								<TableHead>Progresso</TableHead>
								<TableHead className="w-16" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map((item) => {
								const planned = Number(item.plannedQuantity) || 0;
								const current = Number(item.currentQuantity) || 0;
								const percent =
									planned > 0 ? Math.round((current / planned) * 100) : 0;
								return (
									<TableRow key={item.id}>
										<TableCell className="font-medium">
											{item.name}
									</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{INVENTORY_CATEGORY_LABELS[item.category] ||
													item.category}
											</Badge>
										</TableCell>
										<TableCell>
											{INVENTORY_UNIT_LABELS[item.unit] || item.unit}
										</TableCell>
										<TableCell>{planned}</TableCell>
										<TableCell>{current}</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<Progress value={percent} className="h-2 w-20" />
												<span className="text-muted-foreground text-xs">
													{percent}%
												</span>
											</div>
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="icon-sm"
												className="text-destructive"
												onClick={() => setDeleteId(item.id)}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Card>
			</QueryState>

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={setPage}
					onLimitChange={(l) => {
						setLimit(l);
						setPage(1);
					}}
					disabled={itemsQuery.isLoading}
				/>
			)}

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

			<Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar item</DialogTitle>
					</DialogHeader>
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
												toast.success("Eliminado");
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

function InventoryDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onSubmit: (v: any) => void;
	isLoading: boolean;
}) {
	const form = useForm({
		defaultValues: {
			name: "",
			category: "DRINK" as "DRINK" | "FOOD" | "CAKE" | "DECORATION" | "OTHER",
			plannedQuantity: 0,
			currentQuantity: 0,
			unit: "UNIT" as
				| "UNIT"
				| "BOX"
				| "CASE"
				| "BOTTLE"
				| "KG"
				| "LITER"
				| "PACKAGE"
				| "OTHER",
			unitPrice: 0,
			notes: "",
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
					<DialogTitle>Adicionar item ao inventário</DialogTitle>
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
										onValueChange={(v) =>
											field.handleChange(
												v as "DRINK" | "FOOD" | "CAKE" | "DECORATION" | "OTHER",
											)
										}
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
										onValueChange={(v) =>
											field.handleChange(
												v as
													| "UNIT"
													| "BOX"
													| "CASE"
													| "BOTTLE"
													| "KG"
													| "LITER"
													| "PACKAGE"
													| "OTHER",
											)
										}
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
							{isLoading ? "A adicionar..." : "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
