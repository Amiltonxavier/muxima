import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import { getCity, getLocation } from "../-utils/invitation.utils";

export function InvitationLocation({
	invitation,
	variants,
}: {
	invitation: PublicInvitation;
	variants: Variants;
}) {
	const lines = getLocation(invitation);
	const city = getCity(invitation);

	const first = lines[0];
	const rest = lines.slice(1);

	if (!first && !city) return null;

	return (
		<motion.section
			variants={variants}
			className="flex flex-col items-center px-6 pt-12 text-center"
		>
			<p className="invite-luxe font-medium text-[10px] text-[color:var(--ip-accent)] uppercase">
				local
			</p>

			<div className="mt-5 flex flex-col items-center gap-1">
				{first && (
					<p className="invite-serif font-medium text-2xl text-[color:var(--ip-ink)] sm:text-[1.7rem]">
						{first}
					</p>
				)}
				{rest.length > 0 && (
					<p className="mt-1 text-[13px] text-[color:var(--ip-ink-soft)] leading-relaxed">
						{rest.join(", ")}
					</p>
				)}
				{city && (
					<p className="text-[11px] text-[color:var(--ip-ink-soft)] uppercase tracking-[0.2em]">
						{city}
					</p>
				)}
			</div>
		</motion.section>
	);
}
