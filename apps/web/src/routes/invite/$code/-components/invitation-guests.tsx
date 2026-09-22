import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import type { Variants } from "motion/react";
import { motion } from "motion/react";

export function InvitationGuests({
	invitation,
	variants,
}: {
	invitation: PublicInvitation;
	variants: Variants;
}) {
	const guests = invitation.guests;

	if (guests.length === 0) return null;

	return (
		<motion.section
			variants={variants}
			className="flex flex-col items-center px-6 pt-12 text-center"
		>
			<p className="invite-luxe font-medium text-[10px] text-[color:var(--ip-accent)] uppercase">
				convidados
			</p>

			<ul className="mt-5 space-y-3">
				{guests.map((guest) => (
					<li key={guest.id}>
						<p className="invite-serif font-medium text-[color:var(--ip-ink)] text-xl">
							{guest.name}
						</p>
						{guest.companions.length > 0 && (
							<p className="mt-0.5 text-[12px] text-[color:var(--ip-ink-soft)] italic leading-relaxed">
								{guest.companions.map((c) => c.name).join(" · ")}
							</p>
						)}
					</li>
				))}
			</ul>
		</motion.section>
	);
}
