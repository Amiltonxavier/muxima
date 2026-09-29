import { PUBLISHABLE_GUEST_STATUSES } from "../-constants/guest.constants";
import type { InvitationItem } from "../-types/invitation.types";

export function buildInvitationMessage(
	guestName: string,
	invitationLink: string,
) {
	return `Olá ${guestName}! 🎉
Estás convidado(a) para o nosso evento!

Confirma a tua presença: ${invitationLink}`;
}

/**
 * Resolves the shareable invitation URL.
 *
 * Prefers `invitation.url`, which the backend builds from the public token and
 * returns already encoded in the QR Code. The origin fallback only applies to
 * legacy invitations stored before that field existed.
 */
export function resolveInvitationUrl(
	invitation: Pick<InvitationItem, "code" | "url"> | null | undefined,
): string | null {
	if (!invitation) return null;
	if (invitation.url) return invitation.url;
	return `${window.location.origin}/invite/${invitation.code}`;
}

export function isGuestPublishable(status?: string | null): boolean {
	if (!status) return false;
	return (PUBLISHABLE_GUEST_STATUSES as readonly string[]).includes(status);
}

/**
 * An invitation can be published when it is not published yet and at least one
 * of its guests is in a compatible state. The API re-validates all of this.
 */
export function isInvitationPublishable(invitation: InvitationItem): boolean {
	if (invitation.publishedAt) return false;
	if (invitation.status === "CANCELLED" || invitation.status === "EXPIRED") {
		return false;
	}
	return invitation.guests.some(({ guest }) =>
		isGuestPublishable(guest?.status),
	);
}
