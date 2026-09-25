import db from "@muxima/db";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../index";
import {
	createInvitation,
	generateInvitationCode,
	getInvitationStats,
	getPublicInvitation,
	listInvitations,
	respondToInvitation,
} from "../modules/invitations/service";
import { requireEventAccess } from "../shared/auth/event-access";
import {
	publicInvitationCodeLimiter,
	publicInvitationRespondLimiter,
} from "../shared/auth/rate-limit";
import { paginationInput } from "../shared/schemas/filters";
import { getPaginationMeta, parsePagination } from "../shared/utils/helpers";

const invitationCodeSchema = z
	.string()
	.trim()
	.min(1)
	.max(40)
	.transform((code) => code.toUpperCase());

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
					response: z.enum(["CONFIRM", "DECLINE", "MAYBE"]),
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
				throw new Error("Convite não encontrado");
			}),
	},

	publish: protectedProcedure
		.input(z.object({ invitationId: z.string() }))
		.handler(async ({ context, input }) => {
			const invitation = await db.guestInvitation.findUnique({
				where: { id: input.invitationId },
				select: { eventId: true },
			});
			if (!invitation) throw new Error("Convite não encontrado");

			await requireEventAccess(context.session.user.id, invitation.eventId);

			return db.guestInvitation.update({
				where: { id: input.invitationId },
				data: { publishedAt: new Date() },
			});
		}),

	unpublish: protectedProcedure
		.input(z.object({ invitationId: z.string() }))
		.handler(async ({ context, input }) => {
			const invitation = await db.guestInvitation.findUnique({
				where: { id: input.invitationId },
				select: { eventId: true },
			});
			if (!invitation) throw new Error("Convite não encontrado");

			await requireEventAccess(context.session.user.id, invitation.eventId);

			return db.guestInvitation.update({
				where: { id: input.invitationId },
				data: { publishedAt: null },
			});
		}),

	getInvitationStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			return getInvitationStats(db, input.eventId);
		}),

	list: protectedProcedure
		.input(
			z
				.object({
					eventId: z.string(),
					search: z.string().trim().optional(),
					response: z
						.enum([
							"ALL",
							"CONFIRM",
							"DECLINE",
							"MAYBE",
							"PENDING",
							"EXPIRED",
							"CANCELLED",
						])
						.optional()
						.default("ALL"),
				})
				.merge(paginationInput),
		)
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const { page, limit, skip } = parsePagination(input);
			const { data, total: totalInvitationCount } = await listInvitations(
				db,
				input.eventId,
				{
					page,
					limit,
					skip,
					search: input.search,
					response: input.response,
				},
			);

			return {
				data,
				meta: getPaginationMeta(totalInvitationCount, page, limit),
			};
		}),

	/** Manually respond on behalf of one or more guests in an invitation. */
	respond: protectedProcedure
		.input(
			z.object({
				code: invitationCodeSchema,
				response: z.enum(["CONFIRM", "DECLINE", "MAYBE"]),
			}),
		)
		.handler(async ({ context, input }) => {
			const invitation = await db.guestInvitation.findUnique({
				where: { code: input.code },
				select: { eventId: true },
			});
			if (!invitation) throw new Error("Convite não encontrado");

			await requireEventAccess(context.session.user.id, invitation.eventId);

			return respondToInvitation(db, input.code, input.response);
		}),

	create: protectedProcedure
		.input(
			z.object({
				guestIds: z.array(z.string()).min(1),
				eventId: z.string(),
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
};
