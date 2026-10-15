import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { toast } from "sonner";
import { useDeleteFoodPlanItem } from "@/shared/queries/food-plan-queries";
import type { FoodPlanItemRow } from "../-types/food-plan.types";

export function FoodPlanDeleteDialog({
	eventId,
	item,
	open,
	onOpenChange,
}: {
	eventId: string;
	item: FoodPlanItemRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const deleteItem = useDeleteFoodPlanItem();
	const isPending = deleteItem.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Eliminar item</DialogTitle>
					<DialogDescription>
						Tem a certeza de que pretende eliminar "{item?.name ?? ""}"? Esta
						ação não pode ser revertida.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							if (!item) return;
							deleteItem.mutate(
								{ id: item.id, eventId },
								{
									onSuccess: () => {
										toast.success("Item eliminado");
										onOpenChange(false);
									},
								},
							);
						}}
						disabled={isPending}
					>
						{isPending ? "A eliminar..." : "Eliminar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
