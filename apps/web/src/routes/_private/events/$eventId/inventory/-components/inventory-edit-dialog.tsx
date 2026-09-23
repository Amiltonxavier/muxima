import { Button } from "@muxima/ui/components/button";
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
import { toast } from "sonner";
import { CurrencyInput } from "@/shared/components/currency-input";
import { inventoryItemSchema } from "@/utils/inventory-schemas";
import {
	INVENTORY_CATEGORY_LABELS,
	INVENTORY_UNIT_LABELS,
	toSelectItems,
} from "@/utils/status-helpers";
import { useUpdateInventoryItem } from "../-queries/inventory-queries";
import type { InventoryItem } from "../-types/inventory.types";

/**
 * Dedicated edit dialog: it owns its own mutation (dialog → form → mutation →
 * invalidate queries). The current quantity is intentionally not editable
 * here — it only changes through registered movements.
 */
export function InventoryEditDialog({
	open,
	onOpenChange,
	item,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: InventoryItem;
}) {
	const updateItem = useUpdateInventoryItem();

	const form = useForm({
		defaultValues: {
			name: item.name,
			category: item.category,
			unit: item.unit,
			plannedQuantity: item.plannedQuantity,
			venueQuantity: item.venueQuantity,
			unitPrice: item.unitPrice ?? 0,
			notes: item.notes ?? "",
		},
		onSubmit: async ({ value }) => {
			const result = inventoryItemSchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}
			updateItem.mutate(
				{ id: item.id, ...result.data },
				{
					onSuccess: () => {
						toast.success("Item actualizado");
						onOpenChange(false);
					},
					onError: (error) => toast.error(error.message),
				},
			);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Editar item</DialogTitle>
					<DialogDescription>
						A quantidade actual só altera através de movimentos registados.
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
								<Label>Produto</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={updateItem.isPending}
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
										items={toSelectItems(INVENTORY_CATEGORY_LABELS)}
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
											{toSelectItems(INVENTORY_CATEGORY_LABELS).map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
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
										items={toSelectItems(INVENTORY_UNIT_LABELS)}
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
											{toSelectItems(INVENTORY_UNIT_LABELS).map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<form.Field name="plannedQuantity">
							{(field) => (
								<div className="space-y-2">
									<Label>Quantidade planeada</Label>
									<Input
										type="number"
										min={1}
										value={field.state.value || ""}
										onChange={(e) =>
											field.handleChange(Number(e.target.value) || 0)
										}
										disabled={updateItem.isPending}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="venueQuantity">
							{(field) => (
								<div className="space-y-2">
									<Label>Para o salão</Label>
									<Input
										type="number"
										min={0}
										value={field.state.value || ""}
										onChange={(e) =>
											field.handleChange(Number(e.target.value) || 0)
										}
										disabled={updateItem.isPending}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="unitPrice">
							{(field) => (
								<div className="space-y-2">
									<Label>Preço unitário (Kz)</Label>
									<CurrencyInput
										value={field.state.value || 0}
										onChange={(v) => field.handleChange(v)}
										disabled={updateItem.isPending}
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
									disabled={updateItem.isPending}
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
						<Button type="submit" disabled={updateItem.isPending}>
							{updateItem.isPending ? "A guardar..." : "Guardar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
