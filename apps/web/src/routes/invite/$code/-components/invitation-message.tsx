import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import type { Variants } from "motion/react";
import { motion } from "motion/react";

export function InvitationMessage({
	invitation,
	variants,
}: {
	invitation: PublicInvitation;
	variants: Variants;
}) {
	const { description } = invitation.event;

	if (!description) return null;

	return (
		<motion.section
			variants={variants}
			className="flex flex-col items-center px-8 pt-14 text-center"
		>
			<p className="invite-serif whitespace-pre-line text-balance text-[color:var(--ip-ink)] text-lg italic leading-relaxed sm:text-xl">
				{description}
			</p>
		</motion.section>
	);
}
