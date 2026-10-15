import { PERMISSIONS } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";
import { BackButton } from "@/shared/components/back-to";
import { ExportMenu } from "@/shared/components/export-menu";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";

export function FoodPlanHeader({
	eventId,
	onNewItem,
	onNotes,
}: {
	eventId: string;
	onNewItem: () => void;
	onNotes: () => void;
}) {
	const { isEventLocked, lockMessage } = useEventLock();
	const canCreate = useEventCan(eventId, PERMISSIONS.FOOD_PLAN_CREATE);
	const canUpdate = useEventCan(eventId, PERMISSIONS.FOOD_PLAN_UPDATE);

	return (
		<>
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-semibold text-2xl">Alimentação</h1>
					<p className="text-muted-foreground text-sm">
						Plano de refeições do evento. Os valores monetários ficam no
						fornecedor, não no plano.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<ExportMenu eventId={eventId} module="food-plan" />

					{canUpdate && (
						<Button
							variant="outline"
							onClick={onNotes}
							disabled={isEventLocked}
							title={lockMessage ?? undefined}
						>
							Notas
						</Button>
					)}
					{canCreate && (
						<Button
							onClick={onNewItem}
							disabled={isEventLocked}
							title={lockMessage ?? undefined}
						>
							<Plus className="mr-2 h-4 w-4" />
							Novo item
						</Button>
					)}
				</div>
			</div>
		</>
	);
}
