import { Button } from "@muxima/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@muxima/ui/components/dialog";
import { formatDate } from "@/utils/format-date";
import {
	FOOD_PLAN_CATEGORY_LABELS,
	FOOD_PLAN_UNIT_LABELS,
	getStatusLabel,
} from "@/utils/status-helpers";
import type { FoodPlanItemRow } from "../-types/food-plan.types";

export function FoodPlanDetailsDialog({
	item,
	open,
	onOpenChange,
}: {
	item: FoodPlanItemRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const unitLabel =
		FOOD_PLAN_UNIT_LABELS[item?.unit ?? ""]?.toLowerCase() ??
		item?.unit.toLowerCase() ??
		"";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
				<DialogHeader className="border-b pb-4">
					<DialogTitle>{item?.name ?? "Detalhes do item"}</DialogTitle>

					{item && (
						<div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
							<span>
								{FOOD_PLAN_CATEGORY_LABELS[item.category] ?? item.category}
							</span>

							<span aria-hidden="true">·</span>

							<span>{unitLabel}</span>

							<span aria-hidden="true">·</span>

							<span className="font-medium text-foreground">
								{getStatusLabel(item.status, "foodPlan")}
							</span>
						</div>
					)}
				</DialogHeader>

				{item ? (
					<div className="space-y-5 py-2">
						<section>
							<h3 className="font-medium text-sm">Item</h3>
							<p className="mt-1 text-muted-foreground text-xs">
								Dados do prato no plano de alimentação.
							</p>

							<div className="mt-3 space-y-2">
								<InfoRow
									label="Categoria"
									value={
										FOOD_PLAN_CATEGORY_LABELS[item.category] ?? item.category
									}
								/>

								<InfoRow
									label="Quantidade"
									value={`${item.quantity} ${unitLabel}`}
								/>

								<InfoRow
									label="Estado"
									value={getStatusLabel(item.status, "foodPlan")}
								/>
							</div>
						</section>

						{item.description && (
							<section className="border-t pt-4">
								<p className="text-muted-foreground text-xs">Descrição</p>
								<p className="mt-1 text-sm leading-relaxed">
									{item.description}
								</p>
							</section>
						)}

						{item.notes && (
							<section className="border-t pt-4">
								<p className="text-muted-foreground text-xs">Observações</p>
								<p className="mt-1 text-sm leading-relaxed">{item.notes}</p>
							</section>
						)}

						<div className="flex justify-between gap-4 border-t pt-4 text-muted-foreground text-xs">
							<span>Criado em {formatDate(item.createdAt)}</span>
							<span>Actualizado em {formatDate(item.updatedAt)}</span>
						</div>
					</div>
				) : null}

				<DialogFooter className="border-t pt-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Fechar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-muted-foreground text-xs">{label}</span>
			<span className="text-right font-medium text-sm">{value}</span>
		</div>
	);
}
