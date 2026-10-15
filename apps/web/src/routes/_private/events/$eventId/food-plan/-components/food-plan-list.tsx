import { PERMISSIONS } from "@muxima/permissions";
import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import { Card } from "@muxima/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@muxima/ui/components/table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { QueryState } from "@/shared/components/states";
import { StatusDot } from "@/shared/components/status-dot";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";
import { useFoodPlan } from "@/shared/queries/food-plan-queries";
import {
	FOOD_PLAN_CATEGORY_LABELS,
	FOOD_PLAN_UNIT_LABELS,
	getStatusLabel,
	getStatusTone,
} from "@/utils/status-helpers";
import type { FoodPlanItemRow } from "../-types/food-plan.types";
import { FoodPlanDetailsDialog } from "./food-plan-details-dialog";

export function FoodPlanList({
	eventId,
	onEdit,
	onDelete,
}: {
	eventId: string;
	onEdit: (item: FoodPlanItemRow) => void;
	onDelete: (item: FoodPlanItemRow) => void;
}) {
	const planQuery = useFoodPlan(eventId);
	const { isEventLocked, lockMessage } = useEventLock();
	const canUpdate = useEventCan(eventId, PERMISSIONS.FOOD_PLAN_UPDATE);
	const canDelete = useEventCan(eventId, PERMISSIONS.FOOD_PLAN_DELETE);

	const items = (planQuery.data?.items ?? []) as FoodPlanItemRow[];
	const [viewingItem, setViewingItem] = useState<FoodPlanItemRow | null>(null);

	return (
		<>
			<QueryState
				state={{
					isLoading: planQuery.isLoading,
					isError: planQuery.isError,
					isEmpty: items.length === 0,
					hasData: items.length > 0,
				}}
			>
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Item</TableHead>
								<TableHead>Categoria</TableHead>
								<TableHead className="text-right">Quantidade</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead className="w-24 text-right">Ações</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.map((item) => (
								<TableRow key={item.id}>
									<TableCell>
										<div className="space-y-0.5">
											<span className="font-medium">{item.name}</span>
										</div>
									</TableCell>
									<TableCell>
										{FOOD_PLAN_CATEGORY_LABELS[item.category] ?? item.category}
									</TableCell>
									<TableCell className="text-right">
										{item.quantity}{" "}
										{FOOD_PLAN_UNIT_LABELS[item.unit]?.toLowerCase() ??
											item.unit.toLowerCase()}
									</TableCell>
									<TableCell>
										<StatusDot
											label={getStatusLabel(item.status, "foodPlan")}
											tone={getStatusTone(item.status)}
										/>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="icon"
												title="Ver detalhes"
												onClick={() => setViewingItem(item)}
												aria-label="Ver detalhes do item"
											>
												<Eye className="h-4 w-4" />
											</Button>
											{canUpdate && (
												<Button
													variant="ghost"
													size="icon"
													disabled={isEventLocked}
													title={
														isEventLocked
															? (lockMessage ?? undefined)
															: undefined
													}
													onClick={() => onEdit(item)}
													aria-label="Editar item"
												>
													<Pencil className="h-4 w-4" />
												</Button>
											)}
											{canDelete && (
												<Button
													variant="ghost"
													size="icon"
													disabled={isEventLocked}
													title={
														isEventLocked
															? (lockMessage ?? undefined)
															: undefined
													}
													onClick={() => onDelete(item)}
													aria-label="Eliminar item"
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			</QueryState>

			<FoodPlanDetailsDialog
				open={viewingItem !== null}
				item={viewingItem}
				onOpenChange={(open) => {
					if (!open) setViewingItem(null);
				}}
			/>
		</>
	);
}
