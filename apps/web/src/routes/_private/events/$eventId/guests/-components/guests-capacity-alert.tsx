import type { GuestStats } from "@muxima/api/shared/types/entities";
import { AlertTriangle } from "lucide-react";

export function GuestsCapacityAlert({ stats }: { stats?: GuestStats | null }) {
	if (!stats?.atCapacity) {
		return null;
	}

	return (
		<div className="flex items-center gap-3 border border-red-200 bg-red-50 p-4">
			<AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
			<div>
				<p className="font-medium text-red-800 text-sm">Capacidade atingida</p>
				<p className="text-red-600 text-xs">
					{stats.limitGuestCapacity
						? `O evento atingiu a capacidade máxima de ${stats.capacity} pessoas. Novas confirmações estão bloqueadas.`
						: `O evento atingiu a capacidade máxima de ${stats.capacity} pessoas. Considere aumentar a capacidade.`}
				</p>
			</div>
		</div>
	);
}
