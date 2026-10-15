import db from "@muxima/db";
import type { MemberRole, Prisma } from "@muxima/db/prisma";
import { type EventMemberStatus, MemberRepository } from "./repository";

/**
 * The team list the members screen renders.
 *
 * Being invited is not being a member: a pending team invite is an
 * `EventInvitation` row and only becomes an `EventMember` on acceptance. The
 * screen, however, shows ONE list with an "Ativos / Pendentes / Cancelados"
 * split, so this module is the single place that merges the two sources into one
 * shape.
 *
 * The row is discriminated by `kind` so the UI can tell a real membership from
 * an invitation (different wording for the remove action, no OWNER, etc.) while
 * sharing the same `id`/`role`/`status`/`user` columns.
 *
 * `status` reaches the caller from `EventMemberStatus` (a `MemberStatus` plus
 * the invite-only `CANCELLED`), so the Cancelados tab shares one vocabulary.
 */
export type EventMemberListItem = {
	id: string;
	eventId: string;
	role: MemberRole;
	status: EventMemberStatus;
	kind: "MEMBER" | "INVITATION";
	user: { id: string | null; name: string | null; email: string | null } | null;
	createdAt: Date;
	/** Set for invitations only; a membership never expires. */
	expiresAt: Date | null;
};

/** Per-status totals over the whole filtered feed, for the tab counters. */
export type EventMemberCounts = {
	active: number;
	pending: number;
	cancelled: number;
};

export type ListEventMembersParams = {
	eventId: string;
	page: number;
	limit: number;
	search?: string;
	role?: MemberRole;
	status?: EventMemberStatus;
};

export async function listEventMembers(
	params: ListEventMembersParams,
): Promise<{
	data: EventMemberListItem[];
	total: number;
	counts: EventMemberCounts;
}> {
	const { eventId, page, limit, search, role, status } = params;

	// The tab counters must describe the WHOLE team, so both sources are always
	// fetched unfiltered by status: memberships for the Ativos/Pendentes counts
	// and invitations (PENDING for Pendentes, CANCELLED for Cancelados). The
	// requested `status` is then applied to the merged feed in memory.
	const invitationWhere: Prisma.EventInvitationWhereInput = {
		eventId,
		status: { in: ["PENDING", "CANCELLED"] },
	};
	if (search) {
		invitationWhere.email = { contains: search, mode: "insensitive" };
	}
	if (role) {
		invitationWhere.role = role;
	}

	const [members, invitations] = await Promise.all([
		MemberRepository.findAllByEvent(eventId, { search, role }),
		db.eventInvitation.findMany({
			where: invitationWhere,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				eventId: true,
				email: true,
				role: true,
				status: true,
				createdAt: true,
				expiresAt: true,
			},
		}),
	]);

	// One ordered feed (newest first) shared by every tab.
	const allItems: EventMemberListItem[] = [
		...members.map((member) => ({
			id: member.id,
			eventId: member.eventId,
			role: member.role,
			status: member.status,
			kind: "MEMBER" as const,
			user: member.user
				? {
						id: member.user.id,
						name: member.user.name,
						email: member.user.email,
					}
				: null,
			createdAt: member.createdAt,
			expiresAt: null,
		})),
		...invitations.map((invitation) => ({
			id: invitation.id,
			eventId: invitation.eventId,
			role: invitation.role,
			status: invitation.status as EventMemberStatus,
			kind: "INVITATION" as const,
			user: invitation.email
				? { id: null, name: null, email: invitation.email }
				: null,
			createdAt: invitation.createdAt,
			expiresAt: invitation.expiresAt,
		})),
	].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	// Counters describe the FULL team (search/role applied, status NOT), so the
	// tab labels stay correct whichever tab is open.
	const counts: EventMemberCounts = {
		active: allItems.filter((item) => item.status === "ACTIVE").length,
		pending: allItems.filter((item) => item.status === "PENDING").length,
		cancelled: allItems.filter((item) => item.status === "CANCELLED").length,
	};

	// The open tab narrows the feed to a single status before paginating.
	const items = status
		? allItems.filter((item) => item.status === status)
		: allItems;

	const skip = (page - 1) * limit;
	return {
		data: items.slice(skip, skip + limit),
		total: items.length,
		counts,
	};
}
