import { buttonVariants } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail } from "lucide-react";
import { BackButton } from "@/shared/components/back-to";

/**
 * The invitations module was merged into `guests` — the invitation lifecycle
 * (creation, QR Code, publication, bulk publish and responses) is one journey
 * with the guest list, so keeping a second page duplicated both the UI and the
 * queries.
 *
 * The route is intentionally preserved as a notice so old bookmarks and
 * in-app links do not 404.
 */
export const Route = createFileRoute("/_private/events/$eventId/invitations/")({
	component: InvitationsMovedNotice,
});

function InvitationsMovedNotice() {
	const { eventId } = Route.useParams();

	return (
		<div className="space-y-6">
			<BackButton to={`/events/${eventId}`} label="Voltar ao evento" />

			<Card className="mx-auto max-w-xl">
				<CardHeader className="items-center text-center">
					<div className="mb-2 rounded-full bg-muted p-3">
						<Mail className="h-6 w-6" />
					</div>
					<CardTitle>Convites foram para dentro de Convidados</CardTitle>
					<CardDescription>
						A gestão de convites — criação, QR Code, publicação e estatísticas —
						agora vive na aba <strong>Convites</strong> do módulo de convidados,
						evitando duas telas para a mesma informação.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex justify-center">
					<Link
						to="/events/$eventId/guests"
						params={{ eventId }}
						className={buttonVariants({ className: "rounded-none" })}
					>
						Ir para Convidados
						<ArrowRight className="ml-2 h-4 w-4" />
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}
