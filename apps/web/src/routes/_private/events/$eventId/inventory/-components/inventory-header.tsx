import type { InventoryStats } from "@muxima/api/shared/types/entities";
import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";
import { ExportMenu } from "@/shared/components/export-menu";

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

				<Button onClick={onAddItem}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar item
				</Button>
			</div>
		</div>
	);
}
