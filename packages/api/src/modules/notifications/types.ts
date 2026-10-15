export type NotificationType =
	| "FINANCE"
	| "TASKS"
	| "GUESTS"
	| "INVENTORY"
	| "EVENT"
	| "MEMBERS";

export type NotificationPriority =
	| "INFO"
	| "WARNING"
	| "IMPORTANT"
	| "CRITICAL";

/**
 * Structured payload for actionable notifications.
 *
 * `kind` is the discriminator the UI switches on; the rest is context needed
 * to render the action without a second fetch. Kept intentionally small — the
 * database stays the source of truth and the payload only names the resources.
 */
export type MemberInviteNotificationData = {
	kind: "MEMBER_INVITE";
	invitationId: string;
	eventId: string;
	eventName: string;
	role: string;
	inviterName: string | null;
};

export type MemberInviteResponseNotificationData = {
	kind: "MEMBER_INVITE_RESPONSE";
	invitationId: string;
	eventId: string;
	eventName: string;
	status: "ACCEPTED" | "REJECTED";
	memberName: string;
	role: string;
};

export type GuestRsvpNotificationData = {
	kind: "GUEST_RSVP";
	invitationId: string;
	eventId: string;
	eventName: string;
	response: "CONFIRMED" | "DECLINED" | "MAYBE";
	guestNames: string[];
};

export type NotificationData =
	| MemberInviteNotificationData
	| MemberInviteResponseNotificationData
	| GuestRsvpNotificationData;
