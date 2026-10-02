import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import { usePublicSchedule } from "../-queries/guest-invite-queries";
import { InviteBook } from "./invite-book";

/**
 * Post-envelope state: the open invitation book. Data fetching stays here so
 * the book itself remains purely presentational.
 */
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
	const scheduleQuery = usePublicSchedule(invitation.code);

	const scheduleItems =
		scheduleQuery.data?.result === "AVAILABLE" ? scheduleQuery.data.items : [];

	return (
		<InviteBook
			invitation={invitation}
			reduceMotion={reduceMotion}
			isResponding={isResponding}
			onRespond={onRespond}
			onShare={onShare}
			scheduleItems={scheduleItems}
			scheduleLoading={scheduleQuery.isLoading}
			scheduleError={scheduleQuery.isError}
		/>
	);
}
