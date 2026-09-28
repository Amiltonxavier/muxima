import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { Label } from "@muxima/ui/components/label";
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { CurrencyInput } from "@/shared/components/currency-input";
import { type Budget, useUpdateBudgetTarget } from "../-queries/budget-queries";
import type {
	BudgetTargetFormValues,
	BudgetTargetSubmitValues,
} from "../-types/budget.types";

/**
 * The only write path in the budget. It owns the mutation and the toasts, so
 * the page just toggles it open.
 */
export function BudgetTargetDialog({
	open,
	onOpenChange,
	eventId,
	budget,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventId: string;
	budget?: Budget;
}) {
	const updateTarget = useUpdateBudgetTarget();

	function handleSubmit(values: BudgetTargetSubmitValues) {
		updateTarget.mutate(
			{ eventId, ...values },
			{
				onSuccess: () => {
					toast.success("Meta actualizada");
					onOpenChange(false);
				},
				onError: (error) => toast.error(error.message),
			},
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Meta do orçamento</DialogTitle>
					<DialogDescription>
						O valor total planeado para o evento. Os totais, o aproveitamento e
						as categorias são calculados pelo servidor a partir do inventário e
						dos fornecedores.
					</DialogDescription>
				</DialogHeader>

				{/*
				 * Mounted only while open so the form re-seeds from the latest budget:
				 * `defaultValues` is read once, and the target changes after each save.
				 */}
				{open && (
					<TargetForm
						initialValues={{
							plannedAmount: Number(budget?.plannedAmount ?? 0),
							reserveAmount: Number(budget?.reserveAmount ?? 0),
							notes: budget?.notes ?? "",
						}}
						isLoading={updateTarget.isPending}
						onSubmit={handleSubmit}
						onCancel={() => onOpenChange(false)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function TargetForm({
	initialValues,
	isLoading,
	onSubmit,
	onCancel,
}: {
	initialValues: BudgetTargetFormValues;
	isLoading: boolean;
	onSubmit: (values: BudgetTargetSubmitValues) => void;
	onCancel: () => void;
}) {
	const form = useForm({
		defaultValues: initialValues,
		onSubmit: async ({ value }) => {
			if (value.plannedAmount <= 0) {
				toast.error("A meta deve ser maior que zero");
				return;
			}
			if (value.reserveAmount > value.plannedAmount) {
				toast.error("A reserva não pode ultrapassar a meta");
				return;
			}
			onSubmit({
				plannedAmount: value.plannedAmount,
				reserveAmount: value.reserveAmount || undefined,
				notes: value.notes || undefined,
			});
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			<form.Field name="plannedAmount">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="planned-amount">Valor planeado (Kz)</Label>
						<CurrencyInput
							id="planned-amount"
							value={field.state.value || 0}
							onChange={(v) => field.handleChange(v)}
							disabled={isLoading}
						/>
					</div>
				)}
			</form.Field>

			<form.Field name="reserveAmount">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="reserve-amount">Reserva (Kz)</Label>
						<CurrencyInput
							id="reserve-amount"
							value={field.state.value || 0}
							onChange={(v) => field.handleChange(v)}
							disabled={isLoading}
						/>
						<p className="text-muted-foreground text-xs">
							Fica de fora do valor disponível para planeamento.
						</p>
					</div>
				)}
			</form.Field>

			<form.Field name="notes">
				{(field) => (
					<div className="space-y-2">
						<Label htmlFor="budget-notes">Notas</Label>
						<Textarea
							id="budget-notes"
							placeholder="Observações sobre o orçamento (opcional)"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							disabled={isLoading}
						/>
					</div>
				)}
			</form.Field>

			<DialogFooter>
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<Button type="submit" disabled={isLoading}>
					{isLoading ? "A guardar..." : "Guardar"}
				</Button>
			</DialogFooter>
		</form>
	);
}
