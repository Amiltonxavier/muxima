export {
	useAddCompanion,
	useCreateGuest,
	useCreateInvitation,
	useDeleteGuest,
	useGuestStats,
	useGuests,
	useInvitation,
	useRemoveCompanion,
	useRespondToInvitation,
	useUpdateCompanion,
	useUpdateGuest,
} from "@/shared/queries/guest-queries";

export { useTables } from "@/shared/queries/table-queries";

import type { useGuests } from "@/shared/queries/guest-queries";

export type GuestListItem = NonNullable<
	ReturnType<typeof useGuests>["data"]
>["data"][number];
