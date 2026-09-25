// -components/event-not-found.tsx

import { Button } from "@muxima/ui/components/button";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";

export function EventNotFound() {
	return (
		<div className="flex flex-col items-center justify-center py-20">
			<AlertTriangle className="mb-4 h-12 w-12 text-destructive" />

			<h2 className="mb-2 font-semibold text-lg">Evento não encontrado</h2>

			<p className="mb-4 text-muted-foreground text-sm">
				O evento que procura não existe ou foi eliminado.
			</p>

			<Button render={<Link to="/events" />}>
				<ArrowLeft className="mr-2 h-4 w-4" />
				Voltar aos eventos
			</Button>
		</div>
	);
}
