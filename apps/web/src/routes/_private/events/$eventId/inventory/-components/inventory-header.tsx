import type { InventoryStats } from "@muxima/api/shared/types/entities";
import { PERMISSIONS } from "@muxima/permissions";
import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";
import { ExportMenu } from "@/shared/components/export-menu";
import { useEventCan } from "@/shared/hooks/use-can";
import { useEventLock } from "@/shared/hooks/use-event-lock";

export function InventoryHeader({
	eventId,
	stats,
	itemCount,
	onAddItem,
}: {
	eventId: string;
	stats?: InventoryStats | null;
	itemCount: number;
	onAddItem: () => void;
}) {
	const { isEventLocked, lockMessage } = useEventLock();
	// Hidden without `inventory.create` — the backend re-rejects the mutation.
	const canCreate = useEventCan(eventId, PERMISSIONS.INVENTORY_CREATE);

	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="font-semibold text-2xl">Inventário</h1>
				<p className="text-muted-foreground text-sm">
					{stats ? `${stats.totalItems} produtos` : `${itemCount} itens`}
				</p>
			</div>
			<div className="flex gap-2">
				<ExportMenu eventId={eventId} module="inventory" />

				{canCreate && (
					<Button
						onClick={onAddItem}
						disabled={isEventLocked}
						title={lockMessage ?? undefined}
					>
						<Plus className="mr-2 h-4 w-4" />
						Adicionar item
					</Button>
				)}
			</div>
		</div>
	);
}
