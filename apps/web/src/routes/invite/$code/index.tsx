import { createFileRoute } from "@tanstack/react-router";
import { HeartCrack, Hourglass, SearchX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { toast } from "sonner";
import "./-styles/invite.css";
import { InvitationEnvelope } from "./-components/invitation-envelope";
import { InvitationOpenCard } from "./-components/invitation-open-card";
import { InviteAtmosphere } from "./-components/invite-atmosphere";
import { InviteFeedback, InviteLoading } from "./-components/invite-feedback";
import { useInvitationOpening } from "./-hooks/use-invitation-opening";
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
	const opening = useInvitationOpening();
	const lookup = invitationQuery.data;

	useEffect(() => {
		if (lookup?.result === "AVAILABLE") {
			document.title = `${lookup.invitation.event.name} · Convite`;
		} else {
			document.title = "Convite · Muxima";
		}
	}, [lookup]);

	const handleShare = () => {
		navigator.clipboard.writeText(window.location.href);
		toast.success("Link do convite copiado!");
	};

	if (invitationQuery.isLoading) {
		return (
			<InviteAtmosphere>
				<InviteLoading />
			</InviteAtmosphere>
		);
	}

	if (invitationQuery.isError) {
		return (
			<InviteAtmosphere>
				<InviteFeedback
					icon={SearchX}
					title="Ups, algo correu mal"
					description="Não foi possível abrir o convite. Pedimos desculpa — tenta novamente em instantes."
				/>
			</InviteAtmosphere>
		);
	}

	if (!lookup || lookup.result === "NOT_FOUND") {
		return (
			<InviteAtmosphere>
				<InviteFeedback
					icon={SearchX}
					title="Convite não encontrado"
					description="Este convite ainda não foi ativado pelo anfitrião, ou o endereço não está correto."
				/>
			</InviteAtmosphere>
		);
	}

	if (lookup.result === "EXPIRED") {
		return (
			<InviteAtmosphere>
				<InviteFeedback
					icon={Hourglass}
					title="Este convite expirou"
					description="O prazo para responder a este convite já terminou. Agradecemos o teu carinho."
				/>
			</InviteAtmosphere>
		);
	}

	if (lookup.result === "CANCELLED") {
		return (
			<InviteAtmosphere>
				<InviteFeedback
					icon={HeartCrack}
					title="Este convite foi cancelado"
					description="O anfitrião cancelou este convite com muito respeito por ti."
				/>
			</InviteAtmosphere>
		);
	}

	const invitation = lookup.invitation;
	const showEnvelope = opening.phase !== "open";

	return (
		<InviteAtmosphere>
			<AnimatePresence mode="wait">
				{showEnvelope ? (
					<motion.div
						key="envelope"
						exit={{
							opacity: 0,
							scale: 0.92,
							y: 24,
							transition: {
								duration: opening.reduceMotion ? 0 : 0.45,
								ease: [0.22, 1, 0.36, 1],
							},
						}}
					>
						<InvitationEnvelope
							invitation={invitation}
							phase={opening.phase}
							reduceMotion={opening.reduceMotion}
							onOpen={opening.open}
						/>
					</motion.div>
				) : (
					<motion.div key="card" className="w-full">
						<InvitationOpenCard
							invitation={invitation}
							reduceMotion={opening.reduceMotion}
							isResponding={respondMutation.isPending}
							onRespond={(response) =>
								respondMutation.mutate({
									code: normalizedCode,
									response,
								})
							}
							onShare={handleShare}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</InviteAtmosphere>
	);
}
