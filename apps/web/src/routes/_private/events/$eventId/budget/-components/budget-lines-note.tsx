import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

/**
 * The budget is a read model, so the money is edited where it lives. These
 * links point to the two screens that feed the totals.
 */
export function BudgetLinesNote({ eventId }: { eventId: string }) {
	return (
		<p className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
			Os valores são editados na origem:
			<Link
				to="/events/$eventId/inventory"
				params={{ eventId }}
				className="inline-flex items-center gap-1 underline"
			>
				Inventário <ExternalLink className="h-3 w-3" />
			</Link>
			ou
			<Link
				to="/events/$eventId/suppliers"
				params={{ eventId }}
				className="inline-flex items-center gap-1 underline"
			>
				Fornecedores <ExternalLink className="h-3 w-3" />
			</Link>
		</p>
	);
}
