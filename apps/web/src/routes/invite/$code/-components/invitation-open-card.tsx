import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import { motion } from "motion/react";
import { revealContainer, revealItem } from "../-constants/invitation-motion";
import { InvitationDate } from "./invitation-date";
import { InvitationGuests } from "./invitation-guests";
import { InvitationHero } from "./invitation-hero";
import { InvitationLocation } from "./invitation-location";
import { InvitationMessage } from "./invitation-message";
import { InvitationQrCode } from "./invitation-qr-code";
import { InvitationRsvp } from "./invitation-rsvp";

export function InvitationOpenCard({
	invitation,
	reduceMotion,
	isResponding,
	onRespond,
	onShare,
}: {
	invitation: PublicInvitation;
	reduceMotion: boolean;
	isResponding: boolean;
	onRespond: (response: "CONFIRM" | "DECLINE" | "MAYBE") => void;
	onShare?: () => void;
}) {
	const container = revealContainer(reduceMotion);
	const item = revealItem(reduceMotion);

	return (
		<motion.article
			initial="hidden"
			animate="show"
			variants={container}
			className="invite-card invite-paper"
		>
			<div className="m-3 rounded-[4px] border border-[color:var(--ip-line)] sm:m-4">
				<div className="m-1.5 rounded-[3px] border border-[color:var(--ip-accent-soft)]">
					<InvitationHero invitation={invitation} variants={item} />
					<InvitationDate invitation={invitation} variants={item} />
					<InvitationLocation invitation={invitation} variants={item} />
					<InvitationMessage invitation={invitation} variants={item} />
					<InvitationGuests invitation={invitation} variants={item} />
					<InvitationQrCode invitation={invitation} variants={item} />
					<InvitationRsvp
						invitation={invitation}
						isResponding={isResponding}
						onRespond={onRespond}
						onShare={onShare}
						variants={item}
					/>
				</div>
			</div>
		</motion.article>
	);
}
