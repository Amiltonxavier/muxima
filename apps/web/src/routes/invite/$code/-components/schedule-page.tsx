import type {
	PublicInvitation,
	PublicScheduleItem,
} from "@muxima/api/shared/types/entities";
import type { Variants } from "motion/react";
import { motion } from "motion/react";
import { InvitationActions } from "./invitation-actions";
import { InvitationSchedule } from "./invitation-schedule";

/**
 * Right page of the open invitation book: the event programme.
 * Data comes exclusively from the public schedule endpoint — nothing
 * hardcoded. The page header stays fixed while the timeline scrolls inside
 * the page when there are many entries.
 */
export function SchedulePageRight({
	invitation,
	scheduleItems,
	scheduleLoading,
	scheduleError,
	variants,
	navigation,
}: {
	invitation: PublicInvitation;
	scheduleItems: PublicScheduleItem[];
	scheduleLoading: boolean;
	scheduleError: boolean;
	variants?: Variants;
	navigation?: React.ReactNode;
}) {
	return (
		<motion.article
			variants={variants}
			className="invite-book__page invite-book__page--right"
		>
			<div className="invite-book__scroll">
				<InvitationSchedule
					items={scheduleItems}
					isLoading={scheduleLoading}
					isError={scheduleError}
					variants={variants}
				/>
				<InvitationActions invitation={invitation} variants={variants} />
				{navigation}
			</div>
		</motion.article>
	);
}
