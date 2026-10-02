import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import { InvitationCountdown } from "./invitation-countdown";
import { InvitationDate } from "./invitation-date";
import { InvitationGuests } from "./invitation-guests";
import { InvitationHero } from "./invitation-hero";
import { InvitationLocation } from "./invitation-location";
import { InvitationMessage } from "./invitation-message";
import { InvitationQrCode } from "./invitation-qr-code";
import { InvitationRsvp } from "./invitation-rsvp";

/**
 * Botanical corner decoration — purely decorative, pinned to the page corner
 * (not to the scrolling content) and kept subtle so it never competes with
 * the text.
 */
function BotanicalCorner({ className }: { className: string }) {
	return (
		<svg
			aria-hidden="true"
			className={`pointer-events-none absolute z-0 h-20 w-20 text-[color:var(--ip-accent-soft)] opacity-40 sm:h-24 sm:w-24 ${className}`}
			viewBox="0 0 64 64"
			fill="none"
		>
			<path
				d="M62 2C40 6 18 18 10 40c-2 6-3 12-2 22"
				stroke="currentColor"
				strokeWidth="1"
				strokeLinecap="round"
			/>
			<path
				d="M50 10c-8 0-16 4-20 12M40 18c-6 2-11 8-12 14M56 20c-7-1-14 2-18 8"
				stroke="currentColor"
				strokeWidth="0.8"
				strokeLinecap="round"
			/>
		</svg>
	);
}

/**
 * Left page of the open invitation book: the invite itself.
 * Countdown only renders while the RSVP is still responseable (the API's
 * `canRespond` flag is the single source of truth for eligibility).
 */
export function InvitePageLeft({
	invitation,
	isResponding,
	onRespond,
	onShare,
	variants,
	navigation,
}: {
	invitation: PublicInvitation;
	isResponding: boolean;
	onRespond: (response: "CONFIRM" | "DECLINE" | "MAYBE") => void;
	onShare?: () => void;
	variants: Variants;
	navigation?: React.ReactNode;
}) {
	return (
		<motion.article
			variants={variants}
			className="invite-book__page invite-book__page--left invite-paper"
		>
			<BotanicalCorner className="top-2 left-2 sm:top-3 sm:left-3" />
			<BotanicalCorner className="right-2 bottom-2 rotate-180 sm:right-3 sm:bottom-3" />

			<div className="invite-book__scroll">
				<InvitationHero invitation={invitation} variants={variants} />
				{invitation.canRespond && (
					<InvitationCountdown invitation={invitation} variants={variants} />
				)}
				<InvitationDate invitation={invitation} variants={variants} />
				<InvitationLocation invitation={invitation} variants={variants} />
				<InvitationMessage invitation={invitation} variants={variants} />
				<InvitationGuests invitation={invitation} variants={variants} />
				<InvitationRsvp
					invitation={invitation}
					isResponding={isResponding}
					onRespond={onRespond}
					onShare={onShare}
					variants={variants}
				/>
				<InvitationQrCode invitation={invitation} variants={variants} />
				{navigation}
			</div>
		</motion.article>
	);
}
