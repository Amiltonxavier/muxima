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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { inventoryMovementSchema } from "@/routes/_private/events/$eventId/inventory/-schema/inventory-schemas";
import { INVENTORY_UNIT_LABELS } from "@/shared/utils/status-helpers";
import { MOVEMENT_TYPE_OPTIONS } from "../-constants";
import { useAddInventoryMovement } from "@/routes/_private/events/$eventId/inventory/-queries/inventory-queries";



interface MovementDialogProps {
	open: boolean;
	onOpenChange: VoidFunction;
	item: Record<string, unknown>;
}

export function MovementDialog({
	open,
	onOpenChange,
	item,
}: MovementDialogProps) {
		const { mutateAsync, isPending } = useAddInventoryMovement();
	const currentQty = Number(item.currentQuantity) || 0;

	const form = useForm({
		defaultValues: {
			type: "CONSUMPTION" as string,
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
			await mutateAsync(result.data);
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
						Stock atual:{" "}
						<span className="font-medium tabular-nums">{currentQty}</span>{" "}
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
									onValueChange={(v) => field.handleChange(v as string)}
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
									onChange={(e) =>
										field.handleChange(Number(e.target.value) || 0)
									}
									disabled={isPending}
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
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={onOpenChange}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "A registar..." : "Registar movimento"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
