import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";

export function GuestsHeader({ onAddGuest }: { onAddGuest: () => void }) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="font-semibold text-2xl">Convidados</h1>
			</div>
			<Button onClick={onAddGuest}>
				<Plus className="mr-2 h-4 w-4" />
				Adicionar convidado
			</Button>
		</div>
	);
}
