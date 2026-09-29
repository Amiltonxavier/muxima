import type { useMembers } from "../-queries/member-queries";

export type MemberItem = NonNullable<
	ReturnType<typeof useMembers>["data"]
>["data"][number];

/** Mirrors `memberFiltersSchema` on the API. */
export type MemberRole = "OWNER" | "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER";
export type MemberStatus = "PENDING" | "ACTIVE" | "DECLINED";

/** "ALL" is a UI-only value; the query maps it to `undefined`. */
export type MemberRoleFilter = "ALL" | MemberRole;
export type MemberStatusFilter = "ALL" | MemberStatus;

/** Roles a current member can be assigned to (`members.add` rejects OWNER). */
export type AssignableMemberRole = Exclude<MemberRole, "OWNER">;

export type AddMemberValues = {
	email: string;
	role: AssignableMemberRole;
};
