import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";
import { ExportMenu } from "@/shared/components/export-menu";

export function GuestsHeader({
	eventId,
	onAddGuest,
}: {
	eventId: string;
	onAddGuest: () => void;
}) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="font-semibold text-2xl">Convidados</h1>
			</div>
			<div className="flex gap-2">
				<ExportMenu eventId={eventId} module="guests" />

				<Button onClick={onAddGuest}>
					<Plus className="mr-2 h-4 w-4" />
					Adicionar convidado
				</Button>
			</div>
		</div>
	);
}
