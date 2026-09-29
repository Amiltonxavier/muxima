import db from "@muxima/db";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import {
	invitationCodeSchema,
	invitationResponseFilterSchema,
	invitationResponseSchema,
	MAX_BULK_INVITATION_IDS,
} from "../modules/invitations/schemas";
import {
	createInvitation,
	generateInvitationCode,
	getInvitationById,
	getInvitationStats,
	getPublicInvitation,
	listInvitations,
	publishInvitation,
	publishInvitationsBatch,
	respondToInvitation,
	unpublishInvitation,
} from "../modules/invitations/service";
import { requireEventAccess } from "../shared/auth/event-access";
import {
	publicInvitationCodeLimiter,
	publicInvitationRespondLimiter,
} from "../shared/auth/rate-limit";
import { BadRequestError, NotFoundError } from "../shared/errors/app-error";
import { paginationInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

/**
 * Invitations are the backend home of the invitation domain.
 *
 * The UI for these procedures lives in the **guests** module
 * (`apps/web/src/routes/_private/events/$eventId/guests`) — an invitation
 * belongs to a guest, so the whole guest journey (create → publish → respond →
 * preview → QR Code) is managed from there. The old `invitations` page is
 * deactivated and no longer part of the navigation.
 *
 * Every procedure is a thin adapter: validation, authorization and business
 * rules live in `modules/invitations/service.ts`.
 */
export const invitationsRouter = {
	public: {
		getByCode: publicProcedure
			.input(z.object({ code: invitationCodeSchema }))
			.handler(async ({ context, input }) => {
				publicInvitationCodeLimiter.check(
					`${input.code}:${context.ip ?? "unknown"}`,
				);
				return getPublicInvitation(db, input.code);
			}),

		respond: publicProcedure
			.input(
				z.object({
					code: invitationCodeSchema,
					response: invitationResponseSchema,
				}),
			)
			.handler(async ({ context, input }) => {
				publicInvitationRespondLimiter.check(
					`${input.code}:${context.ip ?? "unknown"}`,
				);
				await respondToInvitation(db, input.code, input.response, {
					publishRequired: true,
				});

				const lookup = await getPublicInvitation(db, input.code);
				if (lookup.result === "AVAILABLE") {
					return lookup.invitation;
				}
				throw new NotFoundError("Convite não encontrado");
			}),
	},

	create: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				guestIds: z.array(z.string()).min(1),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return createInvitation(db, input);
		}),

	/** Generate a fresh, unique invitation code without persisting anything. */
	generateCode: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return { code: generateInvitationCode() };
		}),

	list: protectedProcedure
		.input(
			z
				.object({
					eventId: z.string(),
					search: z.string().trim().optional(),
					response: invitationResponseFilterSchema,
				})
				.merge(paginationInput),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const { page, limit, skip } = parsePagination(input);
			const { data, total } = await listInvitations(db, input.eventId, {
				page,
				limit,
				skip,
				search: input.search,
				response: input.response,
			});

			return { data, meta: getPaginationMeta(total, page, limit) };
		}),

	/** Full invitation details for one guest — used by the guests module. */
	byGuest: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				guestId: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return findInvitationByGuest(db, input);
		}),

	getById: protectedProcedure
		.input(z.object({ eventId: z.string(), invitationId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return getInvitationById(db, input);
		}),

	getStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return getInvitationStats(db, input.eventId);
		}),

	// `getInvitationStats` is kept as an alias so existing clients keep working
	// while `getStats` becomes the canonical name.
	getInvitationStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return getInvitationStats(db, input.eventId);
		}),

	publish: protectedProcedure
		.input(z.object({ eventId: z.string(), invitationId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return publishInvitation(db, input);
		}),

	/**
	 * Publish many invitations in one backend operation.
	 *
	 * `scope: "SELECTED"` (default) publishes the ids in the payload.
	 * `scope: "ALL_UNPUBLISHED"` lets the backend resolve every unpublished
	 * invitation of the event — the "publicar todos" flow.
	 */
	publishBatch: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				invitationIds: z.array(z.string()).max(MAX_BULK_INVITATION_IDS),
				scope: z.enum(["SELECTED", "ALL_UNPUBLISHED"]).default("SELECTED"),
			}),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			if (input.scope === "SELECTED" && input.invitationIds.length === 0) {
				throw new BadRequestError("Seleciona pelo menos um convite");
			}

			return publishInvitationsBatch(db, {
				eventId: input.eventId,
				invitationIds: input.invitationIds,
				scope: input.scope,
			});
		}),

	unpublish: protectedProcedure
		.input(z.object({ eventId: z.string(), invitationId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return unpublishInvitation(db, input);
		}),

	/** Manually respond on behalf of one or more guests in an invitation. */
	respond: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				code: invitationCodeSchema,
				response: invitationResponseSchema,
			}),
		)
		.handler(async ({ context, input }) => {
			const invitation = await db.guestInvitation.findUnique({
				where: { code: input.code },
				select: { eventId: true },
			});
			if (!invitation) throw new NotFoundError("Convite não encontrado");

			// The event comes from the invitation, not from the payload, so a
			// user cannot respond to another event's invitation.
			await requireEventAccess(context.session.user.id, invitation.eventId);
			if (invitation.eventId !== input.eventId) {
				throw new NotFoundError("Convite não encontrado");
			}

			return respondToInvitation(db, input.code, input.response);
		}),
};

/**
 * Guests can be attached to more than one invitation, but the guests module
 * only ever shows the most recent one — the same behaviour the previous
 * `guests.getInvitation` endpoint had.
 */
async function findInvitationByGuest(
	prisma: Parameters<typeof getInvitationById>[0],
	input: { eventId: string; guestId: string },
) {
	const invitationGuest = await prisma.invitationGuest.findFirst({
		where: { guestId: input.guestId, invitation: { eventId: input.eventId } },
		orderBy: { invitation: { createdAt: "desc" } },
		select: { invitationId: true },
	});

	if (!invitationGuest) throw new NotFoundError("Convite não encontrado");

	return prisma.guestInvitation.findUnique({
		where: { id: invitationGuest.invitationId },
		include: {
			event: {
				select: {
					id: true,
					name: true,
					type: true,
					status: true,
					eventDate: true,
					startTime: true,
					endTime: true,
					venueName: true,
					address: true,
					neighborhood: true,
					municipality: true,
					province: true,
					owner: { select: { id: true, name: true, email: true } },
				},
			},
			guests: {
				include: {
					guest: {
						include: {
							companions: true,
							tableGuests: { include: { table: true } },
						},
					},
				},
			},
		},
	});
}
