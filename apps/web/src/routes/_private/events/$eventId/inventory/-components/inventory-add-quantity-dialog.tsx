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
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { CurrencyInput } from "@/shared/components/currency-input";
import { formatCurrency } from "@/utils/format-currency";
import { addQuantitySchema } from "@/utils/inventory-schemas";
import { useAddInventoryQuantity } from "../-queries/inventory-queries";
import type { InventoryItem } from "../-types/inventory.types";

/**
 * Registers an entry of quantity for an item. The frontend only sends the
 * quantity and unit price — the backend validates the planned limit and
 * returns the computed cost, which is shown in the success feedback.
 */
export function InventoryAddQuantityDialog({
	open,
	onOpenChange,
	item,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: InventoryItem;
}) {
	const addQuantity = useAddInventoryQuantity();

	const form = useForm({
		defaultValues: {
			quantity: 0,
			unitPrice: item.unitPrice ?? 0,
			reason: "",
		},
		onSubmit: async ({ value }) => {
			const result = addQuantitySchema.safeParse(value);
			if (!result.success) {
				toast.error(result.error.issues[0].message);
				return;
			}
			addQuantity.mutate(
				{
					inventoryItemId: item.id,
					quantity: result.data.quantity,
					unitPrice: result.data.unitPrice,
					reason: result.data.reason || undefined,
				},
				{
					onSuccess: (movement) => {
						toast.success(
							`Quantidade adicionada · Custo: ${formatCurrency(
								movement.totalCost ?? 0,
							)}`,
						);
						onOpenChange(false);
					},
					onError: (error) => toast.error(error.message),
				},
			);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Adicionar quantidade</DialogTitle>
					<DialogDescription>{item.name}</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-3 gap-2 rounded border p-3 text-sm">
					<div>
						<p className="text-muted-foreground text-xs">Planeado</p>
						<p className="font-medium">{item.plannedQuantity}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Actual</p>
						<p className="font-medium">{item.currentQuantity}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Disponível</p>
						<p className="font-medium">{item.remainingQuantity}</p>
					</div>
				</div>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="quantity">
						{(field) => (
							<div className="space-y-2">
								<Label>Quantidade a adicionar</Label>
								<Input
									type="number"
									min={1}
									max={item.remainingQuantity}
									value={field.state.value || ""}
									onChange={(e) =>
										field.handleChange(Number(e.target.value) || 0)
									}
									disabled={addQuantity.isPending}
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
									disabled={addQuantity.isPending}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="reason">
						{(field) => (
							<div className="space-y-2">
								<Label>Motivo (opcional)</Label>
								<Textarea
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={addQuantity.isPending}
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
						<Button
							type="submit"
							disabled={addQuantity.isPending || item.remainingQuantity <= 0}
						>
							{addQuantity.isPending ? "A adicionar..." : "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
