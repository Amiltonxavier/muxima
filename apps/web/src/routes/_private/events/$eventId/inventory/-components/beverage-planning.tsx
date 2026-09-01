import { Package } from "lucide-react";
import { Progress } from "@muxima/ui/components/progress";
import { INVENTORY_UNIT_LABELS } from "@/shared/utils/status-helpers";

interface BeveragePlanningProps {
	drinkStats: {
		count: number;
		totalPlanned: number;
		totalCurrent: number;
	};
	items: Record<string, unknown>[];
}

export function BeveragePlanning({ drinkStats, items }: BeveragePlanningProps) {
	return (
		<div className="rounded-md border border-dashed p-4">
			<div className="mb-3 flex items-center gap-2">
				<Package className="h-4 w-4" />
				<h3 className="font-medium text-sm">Planeamento de Bebidas</h3>
			</div>
			<div className="grid gap-3 sm:grid-cols-3">
				<div>
					<p className="text-muted-foreground text-xs">Itens planeados</p>
					<p className="font-semibold text-lg">{drinkStats.count}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">
						Quantidade total planeada
					</p>
					<p className="font-semibold text-lg">{drinkStats.totalPlanned}</p>
				</div>
				<div>
					<p className="text-muted-foreground text-xs">
						Quantidade total em stock
					</p>
					<p className="font-semibold text-lg">{drinkStats.totalCurrent}</p>
				</div>
			</div>
			<div className="mt-3 space-y-1">
				{items.map((item) => {
					const planned = Number(item.plannedQuantity) || 0;
					const current = Number(item.currentQuantity) || 0;
					const pct = (item.stockPercentage as number) ?? 0;
					return (
						<div
							key={item.id as string}
							className="flex items-center gap-3 text-xs"
						>
							<span className="w-32 truncate font-medium">
								{item.name as string}
							</span>
							<Progress value={pct} className="h-1.5 flex-1" />
							<span className="tabular-nums text-muted-foreground">
								{current}/{planned}{" "}
								{INVENTORY_UNIT_LABELS[item.unit as string] || ""}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
