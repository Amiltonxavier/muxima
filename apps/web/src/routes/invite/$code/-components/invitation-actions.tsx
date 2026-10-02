import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import { CalendarPlus, MapPin } from "lucide-react";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import { downloadIcs, getMapLink } from "../-utils/invitation.utils";

/**
 * Final actions of the invite: map and calendar. Both derive from real event
 * data — the map link is built from the stored venue fields, the calendar
 * file is generated in the browser. Each button renders only when the data
 * it needs actually exists.
 */
export function InvitationActions({
	invitation,
	variants,
}: {
	invitation: PublicInvitation;
	variants?: Variants;
}) {
	const mapLink = getMapLink(invitation);
	const hasEventDate = invitation.event.eventDate !== null;

	if (!mapLink && !hasEventDate) return null;

	return (
		<motion.section
			variants={variants}
			className="flex flex-col items-center gap-3 px-6 pt-10 sm:px-10"
		>
			{mapLink && (
				<a
					href={mapLink}
					target="_blank"
					rel="noopener noreferrer"
					className="invite-luxe w-full max-w-[19rem] border border-[color:var(--ip-line)] bg-[color:var(--ip-paper)] px-6 py-3.5 text-center font-medium text-[10px] text-[color:var(--ip-ink)] uppercase transition-colors duration-200 hover:bg-[rgba(168,135,63,0.08)]"
				>
					<span className="flex items-center justify-center gap-2">
						<MapPin className="h-3.5 w-3.5 text-[color:var(--ip-accent)]" />
						Ver mapa do local
					</span>
				</a>
			)}

			{hasEventDate && (
				<button
					type="button"
					onClick={() => downloadIcs(invitation)}
					className="invite-luxe w-full max-w-[19rem] border border-[color:var(--ip-line)] bg-[color:var(--ip-paper)] px-6 py-3.5 text-center font-medium text-[10px] text-[color:var(--ip-ink)] uppercase transition-colors duration-200 hover:bg-[rgba(168,135,63,0.08)]"
				>
					<span className="flex items-center justify-center gap-2">
						<CalendarPlus className="h-3.5 w-3.5 text-[color:var(--ip-accent)]" />
						Adicionar ao calendário
					</span>
				</button>
			)}
		</motion.section>
	);
}
