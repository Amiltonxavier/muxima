import { Button } from "@muxima/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { BackToAppButton, StatusPage } from "@/shared/components/status-page";

export const Route = createFileRoute("/_private/403/")({
	component: ForbiddenPage,
});

/**
 * Acesso negado. A página não expõe qualquer detalhe de autorização — apenas
 * o que o utilizador pode fazer a partir daqui.
 */
function ForbiddenPage() {
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
			secondaryAction={<BackToAppButton label="Voltar ao início" />}
		/>
	);
}
