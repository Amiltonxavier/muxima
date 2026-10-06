import { Button } from "@muxima/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { z } from "zod";
import { BackToAppButton, StatusPage } from "@/shared/components/status-page";

/**
 * `from` carries the URL that was refused, so the page can offer the way back
 * instead of guessing. It is a display convenience only — a stale or hand-crafted
 * value changes which link is drawn, never what the server allows.
 */
export const Route = createFileRoute("/_private/403/")({
	validateSearch: z.object({ from: z.string().optional() }),
	component: ForbiddenPage,
});

/**
 * Acesso negado. A página não expõe qualquer detalhe de autorização — apenas
 * o que o utilizador pode fazer a partir daqui.
 */
function ForbiddenPage() {
	const { from } = Route.useSearch();

	return (
		<StatusPage
			icon={ShieldAlert}
			title="Acesso negado"
			description="Não tem permissão para aceder a esta área. Se acha que se trata de um engano, peça ao responsável do evento para lhe conceder acesso."
			action={
				<Button render={<Link to="/events" />} size="sm">
					Ver os meus eventos
				</Button>
			}
			secondaryAction={
				from ? (
					<Button
						render={<a href={from}>Voltar</a>}
						variant="outline"
						size="sm"
					>
						Voltar
					</Button>
				) : (
					<BackToAppButton label="Voltar ao início" />
				)
			}
		/>
	);
}
