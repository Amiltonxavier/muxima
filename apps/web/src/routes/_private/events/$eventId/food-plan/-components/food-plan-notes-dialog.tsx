import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Textarea } from "@muxima/ui/components/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	useFoodPlan,
	useUpdateFoodPlanNotes,
} from "@/shared/queries/food-plan-queries";

export function FoodPlanNotesDialog({
	eventId,
	open,
	onOpenChange,
}: {
	eventId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const planQuery = useFoodPlan(eventId);
	const updateNotes = useUpdateFoodPlanNotes();
	const isPending = updateNotes.isPending;

	const initialNotes = planQuery.data?.notes ?? "";
	const [notes, setNotes] = useState(initialNotes);

	// Re-sincroniza o texto sempre que o diálogo abre — o plano pode chegar
	// depois de o diálogo ser montado.
	useEffect(() => {
		if (open) {
			setNotes(initialNotes);
		}
	}, [open, initialNotes]);

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
					/>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button
							onClick={() => {
								updateNotes.mutate(
									{ eventId, notes: notes || undefined },
									{
										onSuccess: () => {
											toast.success("Notas atualizadas");
											onOpenChange(false);
										},
									},
								);
							}}
							disabled={isPending}
						>
							{isPending ? "A guardar..." : "Guardar"}
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
