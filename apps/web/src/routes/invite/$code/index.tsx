import { createFileRoute } from "@tanstack/react-router";
import { HeartCrack, Hourglass, SearchX } from "lucide-react";
import { useEffect } from "react";
import { LoadingState } from "@/shared/components/states/loading-state";
import { EventDetails } from "./-components/event-details";
import { GuestList } from "./-components/guest-list";
import { InviteHeader } from "./-components/invite-header";
import { InviteMessage } from "./-components/invite-message";
import { InviteShell } from "./-components/invite-shell";
import { RsvpSection } from "./-components/rsvp-section";
import {
	usePublicInvitation,
	usePublicRespond,
} from "./-queries/guest-invite-queries";

export const Route = createFileRoute("/invite/$code/")({
	component: InvitePage,
});

function InvitePage() {
	const { code } = Route.useParams();
	const normalizedCode = code.toUpperCase();
	const invitationQuery = usePublicInvitation(normalizedCode);
	const respondMutation = usePublicRespond(normalizedCode);
	const lookup = invitationQuery.data;

	useEffect(() => {
		if (lookup?.result === "AVAILABLE") {
			document.title = `${lookup.invitation.event.name} · Convite`;
		} else {
			document.title = "Convite · Muxima";
		}
	}, [lookup]);

	if (invitationQuery.isLoading) {
		return (
			<InviteShell>
				<LoadingState />
			</InviteShell>
		);
	}

	if (invitationQuery.isError) {
		return (
			<InviteShell>
				<InviteMessage
					icon={SearchX}
					title="Ups, algo correu mal"
					description="Não foi possível carregar o convite. Tenta novamente em instantes."
				/>
			</InviteShell>
		);
	}

	if (!lookup || lookup.result === "NOT_FOUND") {
		return (
			<InviteShell>
				<InviteMessage
					icon={SearchX}
					title="Convite não encontrado"
					description="O código do convite não existe ou ainda não foi ativado pelo anfitrião."
				/>
			</InviteShell>
		);
	}

	if (lookup.result === "EXPIRED") {
		return (
			<InviteShell>
				<InviteMessage
					icon={Hourglass}
					title="Este convite expirou"
					description="O prazo para responder a este convite já terminou."
				/>
			</InviteShell>
		);
	}

	if (lookup.result === "CANCELLED") {
		return (
			<InviteShell>
				<InviteMessage
					icon={HeartCrack}
					title="Este convite foi cancelado"
					description="O anfitrião cancelou este convite."
				/>
			</InviteShell>
		);
	}

	const invitation = lookup.invitation;

	return (
		<InviteShell>
			<InviteHeader invitation={invitation} />
			<EventDetails invitation={invitation} />
			<GuestList invitation={invitation} />
			<RsvpSection
				invitation={invitation}
				isResponding={respondMutation.isPending}
				onRespond={(response) =>
					respondMutation.mutate({ code: normalizedCode, response })
				}
			/>
		</InviteShell>
	);
}