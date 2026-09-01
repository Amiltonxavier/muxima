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
import { toast } from "sonner";
import { expenseSchema } from "@/shared/utils/budget-schemas";

interface ExpenseDialogProps {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onSubmit: (v: Record<string, unknown>) => void;
	isLoading: boolean;
}

export function ExpenseDialog({
	open,
	onOpenChange,
	onSubmit,
	isLoading,
}: ExpenseDialogProps) {
	const form = useForm({
		defaultValues: {
			description: "",
			totalAmount: "",
			vendorId: "",
			expenseDate: "",
			isPaid: false,
			paymentMethod: "CASH",
			category: "OTHER",
		},
		onSubmit: async ({ value }) => {
			const r = expenseSchema.safeParse(value);
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
					<DialogTitle>Adicionar despesa</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<Label>Descricao</Label>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									disabled={isLoading}
								/>
							</div>
						)}
					</form.Field>
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="totalAmount">
							{(field) => (
								<div className="space-y-2">
									<Label>Valor (MZN)</Label>
									<Input
										type="number"
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="expenseDate">
							{(field) => (
								<div className="space-y-2">
									<Label>Data</Label>
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
					<div className="grid grid-cols-2 gap-4">
						<form.Field name="vendorId">
							{(field) => (
								<div className="space-y-2">
									<Label>Fornecedor</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="category">
							{(field) => (
								<div className="space-y-2">
									<Label>Categoria</Label>
									<Input
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										disabled={isLoading}
									/>
								</div>
							)}
						</form.Field>
					</div>
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
