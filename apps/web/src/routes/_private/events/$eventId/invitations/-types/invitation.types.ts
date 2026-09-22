import type { useInvitations } from "../-queries/invitation-queries";

export type InvitationItem = NonNullable<
	ReturnType<typeof useInvitations>["data"]
>["data"][number];