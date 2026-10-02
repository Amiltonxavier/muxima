import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import { useEventCountdown } from "@/shared/hooks/use-event-countdown";
import { composeEventStartAt } from "../-utils/invitation.utils";

/**
 * Countdown to the event start, shown only while the RSVP is responseable —
 * the eligibility flag comes straight from the API (`canRespond`), so the
 * countdown and the RSVP form always agree.
 */
export function InvitationCountdown({
	invitation,
	variants,
}: {
	invitation: PublicInvitation;
	variants?: Variants;
}) {
	const startAt = composeEventStartAt(invitation);
	const countdown = useEventCountdown(startAt);

	if (!startAt || countdown.isExpired) return null;

	const parts = [
		{ label: "dias", value: countdown.days },
		{ label: "horas", value: countdown.hours },
		{ label: "min", value: countdown.minutes },
		{ label: "seg", value: countdown.seconds },
	];

	return (
		<motion.section
			variants={variants}
			className="flex flex-col items-center px-6 pt-10 text-center"
			aria-label="Contagem decrescente para o evento"
		>
			<p className="invite-luxe font-medium text-[10px] text-[color:var(--ip-accent)] uppercase">
				faltam
			</p>

			<div className="mt-4 flex items-start justify-center gap-4 sm:gap-6">
				{parts.map((part) => (
					<div
						key={part.label}
						className="flex min-w-[3rem] flex-col items-center"
					>
						<span className="invite-serif font-light text-4xl text-[color:var(--ip-ink)] tabular-nums sm:text-5xl">
							{String(part.value).padStart(2, "0")}
						</span>
						<span className="mt-1 text-[10px] text-[color:var(--ip-ink-soft)] uppercase tracking-[0.18em]">
							{part.label}
						</span>
					</div>
				))}
			</div>
		</motion.section>
	);
}
