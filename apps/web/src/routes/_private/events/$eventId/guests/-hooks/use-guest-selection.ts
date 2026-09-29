import { useCallback, useMemo } from "react";
import type { GuestItem } from "../-types/guest.types";
import { getGuestInvitation } from "../-utils/guest.utils";
import { useVisibleSelection } from "./use-visible-selection";

/**
 * Multi-selection for the guests table.
 *
 * Selection is keyed by guest id, so the contextual toolbar can group the
 * selected guests into:
 *   • guests that already have an unpublished invitation  → publish in bulk
 *   • guests with no invitation yet                        → create in bulk
 *
 * Both operations resolve to ONE backend call, never a per-guest loop.
 */
export function useGuestSelection(guests: GuestItem[]) {
	const visibleGuestIds = useMemo(
		() => guests.map((guest) => guest.id),
		[guests],
	);

	const selection = useVisibleSelection(visibleGuestIds);
	const { selectedIdSet } = selection;

	const selectedGuests = useMemo(
		() => guests.filter((guest) => selectedIdSet.has(guest.id)),
		[guests, selectedIdSet],
	);

	/** Ids of the selected invitations that can be published right now. */
	const publishableInvitationIds = useMemo(
		() =>
			selectedGuests.flatMap((guest) => {
				const invitation = getGuestInvitation(guest);
				return invitation && !invitation.publishedAt ? [invitation.id] : [];
			}),
		[selectedGuests],
	);

	/** Selected guests that do not have any invitation yet. */
	const guestsWithoutInvitation = useMemo(
		() => selectedGuests.filter((guest) => !getGuestInvitation(guest)),
		[selectedGuests],
	);

	const toggleGuest = useCallback(
		(id: string) => selection.toggle(id),
		[selection],
	);

	return {
		...selection,
		selectedGuests,
		publishableInvitationIds,
		guestsWithoutInvitation,
		toggleGuest,
	};
}
