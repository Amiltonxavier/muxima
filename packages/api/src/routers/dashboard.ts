import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { getBudgetSnapshot } from "../modules/budget/repository";
import { requireEventAccess } from "../shared/auth/event-access";
import { centsToUnits } from "../shared/finance/money";

export const dashboardRouter = {
	getGlobalStats: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		const [events, guests, invitations, suppliers, budgets, members] =
			await Promise.all([
				db.event.count({ where: { ownerId: userId } }),
				db.guest.count({
					where: { event: { ownerId: userId } },
				}),
				db.guestInvitation.count({
					where: { event: { ownerId: userId } },
				}),
				db.supplier.count({
					where: { event: { ownerId: userId } },
				}),
				db.budget.count({
					where: { event: { ownerId: userId } },
				}),
				db.eventMember.count({
					where: { event: { ownerId: userId } },
				}),
			]);

		return {
			events,
			guests,
			invitations,
			suppliers,
			budgets,
			members,
		};
	}),

	getGuestChart: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const event = await db.event.findUnique({
				where: { id: input.eventId },
				select: { capacity: true },
			});

			const totalGuests = await db.guest.count({
				where: { eventId: input.eventId },
			});

			const confirmedGuests = await db.guest.count({
				where: { eventId: input.eventId, status: "CONFIRMED" },
			});

			const capacity = event?.capacity || 0;

			return {
				capacity,
				invited: totalGuests,
				confirmed: confirmedGuests,
				remaining: capacity > 0 ? capacity - totalGuests : 0,
				percentage:
					capacity > 0 ? Math.round((totalGuests / capacity) * 100) : 0,
			};
		}),

	/**
	 * Budget chart data. Every figure comes from the shared budget aggregator,
	 * so the dashboard can never disagree with the budget page.
	 */
	getBudgetChart: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);
			const { totals, breakdown } = await getBudgetSnapshot(input.eventId);

			return {
				totalBudget: centsToUnits(totals.totalBudget),
				reserve: centsToUnits(totals.reserve),
				available: centsToUnits(totals.available),
				planned: centsToUnits(totals.planned),
				spent: centsToUnits(totals.spent),
				pending: centsToUnits(totals.pending),
				overdue: centsToUnits(totals.overdue),
				usagePercentage: totals.usagePercentage,
				currency: totals.currency,
				bySource: breakdown.bySource.map((entry) => ({
					...entry,
					planned: centsToUnits(entry.planned),
					paid: centsToUnits(entry.paid),
					pending: centsToUnits(entry.pending),
				})),
				byCategory: breakdown.byCategory.map((entry) => ({
					...entry,
					planned: centsToUnits(entry.planned),
					paid: centsToUnits(entry.paid),
					pending: centsToUnits(entry.pending),
				})),
			};
		}),
};
