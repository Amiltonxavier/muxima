import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import { getDateParts, getTime } from "../-utils/invitation.utils";

export function InvitationDate({
	invitation,
	variants,
}: {
	invitation: PublicInvitation;
	variants: Variants;
}) {
	const date = getDateParts(invitation.event.eventDate);
	const time = getTime(invitation);

	if (!date) return null;

	return (
		<motion.section
			variants={variants}
			className="flex flex-col items-center px-6 pt-10 text-center"
		>
			<p className="invite-luxe font-medium text-[10px] text-[color:var(--ip-accent)] uppercase">
				data
			</p>

			<div className="mt-5 flex flex-col items-center">
				<span className="invite-luxe font-medium text-[color:var(--ip-ink)] text-sm uppercase">
					{date.monthLabel}
				</span>
				<span className="invite-serif mt-1 font-light text-6xl text-[color:var(--ip-ink)] sm:text-7xl">
					{date.day}
				</span>
				<span className="invite-serif mt-2 text-[color:var(--ip-ink-soft)] text-xl tracking-wide">
					{date.year}
				</span>
			</div>

			{time.start && (
				<div className="mt-8 flex flex-col items-center gap-1">
					<span className="invite-serif font-medium text-2xl text-[color:var(--ip-ink)]">
						às {time.start}
					</span>
					{time.end && (
						<span className="text-[11px] text-[color:var(--ip-ink-soft)] uppercase tracking-[0.18em]">
							até às {time.end}
						</span>
					)}
				</div>
			)}
		</motion.section>
	);
}
