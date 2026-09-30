import type { useProfile } from "../-queries/user-queries";

export type ProfileItem = NonNullable<ReturnType<typeof useProfile>["data"]>;

export type ProfileFormValues = {
	name: string;
	email: string;
};

export type AccountStatus = "ACTIVE" | "BLOCKED";

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
	ACTIVE: "Ativa",
	BLOCKED: "Bloqueada",
};

/**
 * A role exactly as the backend resolved it from the user's `EventMember` rows.
 * `name` and `permissions` are display/authorisation data from the server —
 * the Profile tab renders them as received and never derives them locally.
 */
export type ProfileRole = ProfileItem["roles"][number];

export type ProfilePermission = ProfileItem["permissions"][number];
