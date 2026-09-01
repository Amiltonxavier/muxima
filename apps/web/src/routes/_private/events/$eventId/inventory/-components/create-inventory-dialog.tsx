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
import { Textarea } from "@muxima/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { Cake } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { inventoryItemSchema } from "@/routes/_private/events/$eventId/inventory/-schema/inventory-schemas";
import {
	CAKE_TYPE_LABELS,
	INVENTORY_CATEGORY_LABELS,
	INVENTORY_UNIT_LABELS,
} from "@/shared/utils/status-helpers";
import { useCreateInventoryItem } from "@/routes/_private/events/$eventId/inventory/-queries/inventory-queries";
import { useEvent } from "@/routes/_private/events/-queries/event-queries";

interface CreateInventoryDialogProps {
	open: boolean;
	onOpenChange: VoidFunction;
	eventId: string;
}

export function CreateInventoryDialog({
	open,
	onOpenChange,
	eventId,
}: CreateInventoryDialogProps) {
	const { mutateAsync, isPending } = useCreateInventoryItem();
	const eventQuery = useEvent(eventId);
	const eventDate = eventQuery.data?.eventDate
		? new Date(String(eventQuery.data.eventDate)).toISOString().split("T")[0]
		: "";

	const form = useForm({
		defaultValues: {
			name: "",
			category: "DRINK" as string,
			plannedQuantity: 0,
			currentQuantity: 0,
			unit: "UNIT" as string,
			unitPrice: 0,
			cakeType: "" as string,
			weight: 0,
			deliveryDate: eventDate,
			notes: "",
		},
		onSubmit: async ({ value }) => {
			const r = inventoryItemSchema.safeParse(value);
			if (!r.success) {
				toast.error(r.error.issues[0].message);
				return;
			}
				await mutateAsync({
					...r.data,
					eventId,
					cakeType: value.cakeType || undefined,
					weight: value.weight || undefined,
					deliveryDate: value.deliveryDate || undefined,
				}).then(()=>onOpenChange());
			
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						Adicionar item ao inventário
					</DialogTitle>
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
									disabled={isPending}
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
										onValueChange={(v) => field.handleChange(v as string)}
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
										onValueChange={(v) => field.handleChange(v as string)}
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
										disabled={isPending}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="unitPrice">
							{(field) => (
								<div className="space-y-2">
									<Label>Preço por unidade (Kz)</Label>
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
					</div>


					<form.Subscribe selector={(state) => state.values.category}>
						{(category) =>
							category === "CAKE" && (
								<div className="space-y-4 border border-dashed p-4">
									<div className="flex items-center gap-2">
										<Cake className="h-4 w-4 text-pink-400" />
										<span className="font-medium text-sm">
											Campos de bolo (opcional)
										</span>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<form.Field name="cakeType">
											{(field) => (
												<div className="space-y-2">
													<Label>Tipo de bolo</Label>

													<Select
														items={Object.entries(CAKE_TYPE_LABELS).map(
															([value, label]) => ({ value, label }),
														)}
														value={field.state.value}
														onValueChange={(v) =>
															field.handleChange(v as string)
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="Selecionar..." />
														</SelectTrigger>

														<SelectContent>
															{Object.entries(CAKE_TYPE_LABELS).map(
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

										<form.Field name="weight">
											{(field) => (
												<div className="space-y-2">
													<Label>Peso (kg)</Label>

													<Input
														type="number"
														value={field.state.value || ""}
														onChange={(e) =>
															field.handleChange(
																Number(e.target.value) || 0,
															)
														}
														disabled={isPending}
													/>
												</div>
											)}
										</form.Field>
									</div>

									<form.Field name="deliveryDate">
										{(field) => (
											<div className="space-y-2">
												<Label>Data de entrega</Label>

												<Input
													type="date"
													value={field.state.value}
													onChange={(e) =>
														field.handleChange(e.target.value)
													}
													disabled={isPending}
												/>
											</div>
										)}
									</form.Field>
								</div>
							)
						}
					</form.Subscribe>

					<form.Field name="notes">
						{(field) => (
							<div className="space-y-2">
								<Label>Notas</Label>
								<Textarea
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
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
							{isPending
								? "A guardar..."
								: "Adicionar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
