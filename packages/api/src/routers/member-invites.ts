import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	acceptInvitation,
	assertClaimable,
	countPendingForEmail,
	declineInvitation,
	listPendingForEmail,
	loadInvitationById,
	loadInvitationByToken,
} from "../modules/members/invitations";
import { roleLabel } from "../shared/mail";

/**
 * Team invitation preview + claim (accept/decline).
 *
 * Two equivalent entry points share ONE implementation:
 *  - by opaque token, from the e-mail link (`accept` / `decline`);
 *  - by invitation id, from the in-app notification center
 *    (`acceptById` / `declineById`).
 *
 * Both resolve the invitation, run the exact same `assertClaimable` checks
 * (belongs to the signed-in e-mail, unexpired, still PENDING) and call the same
 * service, so the two surfaces can never drift.
 */
export const memberInvitesRouter = {
	get: protectedProcedure
		.input(z.object({ token: z.string().min(1) }))
		.handler(async ({ context, input }) => {
			const invitation = await loadInvitationByToken(input.token);
			assertClaimable(invitation, context.session.user.email);

			return {
				eventId: invitation.eventId,
				eventName: invitation.event.name,
				role: invitation.role,
				roleLabel: roleLabel(invitation.role),
				invitedByName: invitation.inviter?.name ?? null,
				expiresAt: invitation.expiresAt,
			};
		}),

	/** Pending invitations addressed to the signed-in account. */
	listMine: protectedProcedure.handler(async ({ context }) => {
		const data = await listPendingForEmail(context.session.user.email);
		return { data };
	}),

	countMine: protectedProcedure.handler(async ({ context }) => {
		return countPendingForEmail(context.session.user.email);
	}),

	accept: protectedProcedure
		.input(z.object({ token: z.string().min(1) }))
		.handler(async ({ context, input }) => {
			const invitation = await loadInvitationByToken(input.token);
			assertClaimable(invitation, context.session.user.email);

			return acceptInvitation(invitation, {
				id: context.session.user.id,
				name: context.session.user.name,
			});
		}),

	decline: protectedProcedure
		.input(z.object({ token: z.string().min(1) }))
		.handler(async ({ context, input }) => {
			const invitation = await loadInvitationByToken(input.token);
			assertClaimable(invitation, context.session.user.email);

			return declineInvitation(invitation, {
				id: context.session.user.id,
				name: context.session.user.name,
			});
		}),

	acceptById: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.handler(async ({ context, input }) => {
			const invitation = await loadInvitationById(input.id);
			assertClaimable(invitation, context.session.user.email);

			return acceptInvitation(invitation, {
				id: context.session.user.id,
				name: context.session.user.name,
			});
		}),

	declineById: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.handler(async ({ context, input }) => {
			const invitation = await loadInvitationById(input.id);
			assertClaimable(invitation, context.session.user.email);

			return declineInvitation(invitation, {
				id: context.session.user.id,
				name: context.session.user.name,
			});
		}),
};
