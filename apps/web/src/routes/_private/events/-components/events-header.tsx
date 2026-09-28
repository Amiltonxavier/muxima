import { Button } from "@muxima/ui/components/button";
import { Plus } from "lucide-react";

export function EventsHeader({ onCreate }: { onCreate: () => void }) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<h1 className="font-semibold text-2xl">Eventos</h1>
				<p className="text-muted-foreground text-sm">
					Gira os seus eventos de noivado e casamento
				</p>
			</div>
			<Button onClick={onCreate}>
				<Plus className="mr-2 h-4 w-4" />
				Criar evento
			</Button>
		</div>
	);
}
