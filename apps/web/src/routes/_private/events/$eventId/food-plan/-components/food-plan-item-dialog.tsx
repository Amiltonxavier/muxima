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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
	type FoodPlanCategoryValue,
	type FoodPlanStatusValue,
	type FoodPlanUnitValue,
	useAddFoodPlanItem,
	useUpdateFoodPlanItem,
} from "@/shared/queries/food-plan-queries";
import {
	FOOD_PLAN_CATEGORY_LABELS,
	FOOD_PLAN_STATUS_LABELS,
	FOOD_PLAN_UNIT_LABELS,
	toSelectItems,
} from "@/utils/status-helpers";
import type { FoodPlanItemRow } from "../-types/food-plan.types";

export function FoodPlanItemDialog({
	eventId,
	open,
	onOpenChange,
	editingItem,
}: {
	eventId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editingItem: FoodPlanItemRow | null;
}) {
	const addItem = useAddFoodPlanItem();
	const updateItem = useUpdateFoodPlanItem();
	const isPending = addItem.isPending || updateItem.isPending;

	const isEditing = editingItem !== null;

	const form = useForm({
		defaultValues: {
			name: editingItem?.name ?? "",
			category:
				(editingItem?.category as FoodPlanCategoryValue) ?? "MAIN_COURSE",
			quantity: editingItem?.quantity ?? 1,
			unit: (editingItem?.unit as FoodPlanUnitValue) ?? "PORTION",
			description: editingItem?.description ?? "",
			notes: editingItem?.notes ?? "",
			status: (editingItem?.status as FoodPlanStatusValue) ?? "PENDING",
		},
		onSubmit: async ({ value }) => {
			if (editingItem) {
				updateItem.mutate(
					{
						id: editingItem.id,
						eventId,
						name: value.name,
						category: value.category,
						quantity: value.quantity,
						unit: value.unit,
						description: value.description || null,
						notes: value.notes || null,
						status: value.status,
					},
					{
						onSuccess: () => {
							toast.success("Item atualizado");
							onOpenChange(false);
						},
					},
				);
				return;
			}
			addItem.mutate(
				{
					eventId,
					name: value.name,
					category: value.category,
					quantity: value.quantity,
					unit: value.unit,
					description: value.description || undefined,
					notes: value.notes || undefined,
					status: value.status,
				},
				{
					onSuccess: () => {
						toast.success("Item adicionado ao plano");
						onOpenChange(false);
					},
				},
			);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? "Editar item" : "Novo item do plano"}
					</DialogTitle>
					<DialogDescription>
						O plano não tem preços: o valor do catering fica no fornecedor
						associado.
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
								<Label htmlFor="food-plan-name">Nome</Label>
								<Input
									id="food-plan-name"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Ex.: Cabrito assado"
									disabled={isPending}
									required
								/>
							</div>
						)}
					</form.Field>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.Field name="category">
							{(field) => (
								<div className="space-y-2">
									<Label>Categoria</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as FoodPlanCategoryValue)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{toSelectItems(FOOD_PLAN_CATEGORY_LABELS).map(
												(option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>

						<form.Field name="status">
							{(field) => (
								<div className="space-y-2">
									<Label>Estado</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as FoodPlanStatusValue)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{toSelectItems(FOOD_PLAN_STATUS_LABELS).map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<form.Field name="quantity">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor="food-plan-quantity">Quantidade</Label>
									<Input
										id="food-plan-quantity"
										type="number"
										min={0}
										step="any"
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(
												e.target.value === "" ? 0 : Number(e.target.value),
											)
										}
										disabled={isPending}
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="unit">
							{(field) => (
								<div className="space-y-2">
									<Label>Unidade</Label>
									<Select
										value={field.state.value}
										onValueChange={(v) =>
											field.handleChange(v as FoodPlanUnitValue)
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{toSelectItems(FOOD_PLAN_UNIT_LABELS).map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>
					</div>

					<form.Field name="description">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="food-plan-description">Descrição</Label>
								<Textarea
									id="food-plan-description"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Detalhes do item (opcional)"
									disabled={isPending}
								/>
							</div>
						)}
					</form.Field>

					<form.Field name="notes">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor="food-plan-notes">Notas</Label>
								<Textarea
									id="food-plan-notes"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Observações (opcional)"
									disabled={isPending}
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
						<Button type="submit" disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />A guardar...
								</>
							) : isEditing ? (
								"Guardar"
							) : (
								"Adicionar"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
