import type { useMembers } from "../-queries/member-queries";

export type MemberItem = NonNullable<
	ReturnType<typeof useMembers>["data"]
>["data"][number];

/** Mirrors `memberFiltersSchema` on the API. */
export type MemberRole = "OWNER" | "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER";
/**
 * Membership statuses plus `CANCELLED`, which only ever applies to a revoked
 * invitation — the "Cancelados" tab of the team screen.
 */
export type MemberStatus = "PENDING" | "ACTIVE" | "DECLINED" | "CANCELLED";

/** "ALL" is a UI-only value; the query maps it to `undefined`. */
export type MemberRoleFilter = "ALL" | MemberRole;
export type MemberStatusFilter = "ALL" | MemberStatus;

/** Roles a current member can be assigned to (`members.add` rejects OWNER). */
export type AssignableMemberRole = Exclude<MemberRole, "OWNER">;

export type AddMemberValues = {
	email: string;
	role: AssignableMemberRole;
};
