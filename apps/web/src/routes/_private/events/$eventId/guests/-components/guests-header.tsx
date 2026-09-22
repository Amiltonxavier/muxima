import type { GuestStats } from "@muxima/api/shared/types/entities";
import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";

export function GuestsHeader({
	stats,
	guestCount,
	onAddGuest,
}: {
	stats?: GuestStats | null;
	guestCount: number;
	onAddGuest: () => void;
}) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="font-semibold text-2xl">Convidados</h1>
				<p className="text-muted-foreground text-sm">
					{stats ? (
						<>
							{stats.totalGuests} convidados · {stats.totalConfirmedPeople}{" "}
							pessoas confirmadas
						</>
					) : (
						`${guestCount} convidados`
					)}
				</p>
			</div>
			<Button onClick={onAddGuest}>
				<Plus className="mr-2 h-4 w-4" />
				Adicionar convidado
			</Button>
		</div>
	);
}
