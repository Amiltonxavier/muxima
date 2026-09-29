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
