import { AlertTriangle } from "lucide-react";

export function InvitationWarning() {
	return (
		<section className="border-l-2 px-4 py-1">
			<div className="flex items-start gap-2.5">
				<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
				<div>
					<p className="font-medium text-sm">Informação importante</p>
					<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
						Por favor, não convidar outras pessoas além das indicadas neste
						convite. A lotação foi definida de acordo com a capacidade do
						evento.
					</p>
				</div>
			</div>
		</section>
	);
}
