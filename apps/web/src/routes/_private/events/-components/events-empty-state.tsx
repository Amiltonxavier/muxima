import { Button } from "@muxima/ui/components/button";
import { Gift, Plus } from "lucide-react";

export function EventsEmptyState({ onCreate }: { onCreate: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
			<Gift className="mb-4 h-12 w-12 text-muted-foreground" />
			<h3 className="font-medium text-lg">Ainda não possui eventos</h3>
			<p className="mb-4 text-muted-foreground text-sm">
				Crie o seu primeiro evento para começar a planear
			</p>
			<Button onClick={onCreate}>
				<Plus className="mr-2 h-4 w-4" />
				Criar evento
			</Button>
		</div>
	);
}
