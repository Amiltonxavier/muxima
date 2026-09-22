import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import {
	getEventTypeLabel,
	getPrelude,
	getRecipientInitials,
	getRecipientName,
} from "../-utils/invitation.utils";

export function InvitationHero({
	invitation,
	variants,
}: {
	invitation: PublicInvitation;
	variants: Variants;
}) {
	const { event, host } = invitation;
	const monogram = getRecipientInitials(invitation);
	const prelude = getPrelude(event.type, invitation.guests.length > 0);
	const typeLabel = getEventTypeLabel(event.type);
	const recipient = getRecipientName(invitation);

	return (
		<motion.header
			variants={variants}
			className="flex flex-col items-center px-6 pt-12 text-center sm:px-10 sm:pt-16"
		>
			{monogram && (
				<span
					aria-hidden="true"
					className="invite-serif mb-6 text-2xl text-[color:var(--ip-accent)] tracking-[0.35em]"
				>
					{monogram}
				</span>
			)}

			<p className="invite-luxe font-medium text-[10px] text-[color:var(--ip-ink)] uppercase sm:text-[11px]">
				{prelude}
			</p>

			<h1 className="invite-serif mt-6 font-medium text-[2.6rem] text-[color:var(--ip-ink)] leading-[1.08] sm:text-5xl">
				{event.name}
			</h1>

			<p className="invite-serif mt-5 text-[15px] text-[color:var(--ip-ink-soft)] italic sm:text-base">
				{typeLabel && <span>{typeLabel} · </span>}
				de <span className="font-medium not-italic">{host.name}</span>
			</p>

			{recipient && (
				<p className="mt-8 text-[11px] text-[color:var(--ip-ink-soft)] uppercase tracking-[0.18em]">
					para {recipient}
				</p>
			)}
		</motion.header>
	);
}
