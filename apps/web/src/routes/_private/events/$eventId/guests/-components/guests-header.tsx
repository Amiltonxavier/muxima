import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";
import { ExportMenu } from "@/shared/components/export-menu";
import { useEventLock } from "@/shared/hooks/use-event-lock";

export function GuestsHeader({
	eventId,
	onAddGuest,
}: {
	eventId: string;
	onAddGuest: () => void;
}) {
	const { isEventLocked, lockMessage } = useEventLock();

	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="font-semibold text-2xl">Convidados</h1>
			</div>
			<div className="flex gap-2">
				<ExportMenu eventId={eventId} module="guests" />

				<Button
					onClick={onAddGuest}
					disabled={isEventLocked}
					title={lockMessage ?? undefined}
				>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar convidado
				</Button>
			</div>
		</div>
	);
}
