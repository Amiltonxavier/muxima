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
import { useForm } from "@tanstack/react-form";

interface EditBudgetDialogProps {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	budgetLimit: number;
	onSubmit: (v: { budgetLimit: number }) => void;
	isLoading: boolean;
}

export function EditBudgetDialog({
	open,
	onOpenChange,
	budgetLimit,
	onSubmit,
	isLoading,
}: EditBudgetDialogProps) {
	const form = useForm({
		defaultValues: { budgetLimit: budgetLimit || 0 },
		onSubmit: async ({ value }) => {
			onSubmit(value);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Editar limite</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="budgetLimit">
						{(field) => (
							<div className="space-y-2">
								<Label>Limite (MZN)</Label>
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
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? "A guardar..." : "Guardar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
