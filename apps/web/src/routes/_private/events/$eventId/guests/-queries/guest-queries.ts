export {
	useAddCompanion,
	useCreateGuest,
	useDeleteGuest,
	useGuestStats,
	useGuests,
	useRemoveCompanion,
	useUpdateCompanion,
	useUpdateGuest,
} from "@/shared/queries/guest-queries";

export { useTables } from "@/shared/queries/table-queries";
/**
 * Invitation queries/mutations live in their own module (`./invitation-queries`)
 * and are imported directly. They are intentionally NOT re-exported here: the
 * invitation API namespace is `orpc.invitations`, and keeping it in a separate
 * file makes it obvious that the guests page and the (deactivated) invitations
 * page consume the exact same backend operations.
 */
export type {
	BulkPublishSummary,
	InvitationItem,
} from "../-types/invitation.types";

import type { useGuests } from "@/shared/queries/guest-queries";

export type GuestListItem = NonNullable<
	ReturnType<typeof useGuests>["data"]
>["data"][number];
