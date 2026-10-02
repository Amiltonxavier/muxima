import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";
import type { InvitationStats } from "../../shared/types/entities";
import { getInvitationStats } from "./service";

/**
 * Invitation/RSVP analytics. Delegates to the shared `getInvitationStats`, the
 * same function behind `invitations.getStats`.
 */
export type { InvitationStats };

export async function getInvitationAnalytics(
	_client: PrismaClient,
	eventId: string,
): Promise<InvitationStats> {
	return getInvitationStats(db, eventId);
}

export const invitationAnalytics = {
	get: (eventId: string) => getInvitationAnalytics(db, eventId),
};
