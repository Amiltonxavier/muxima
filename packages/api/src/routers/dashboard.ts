import db from "@muxima/db";
import { PERMISSIONS } from "@muxima/permissions";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { getBudgetSnapshot } from "../modules/budget/repository";
import { requireEventPermission } from "../shared/auth/authorization";

import { centsToUnits } from "../shared/finance/money";

export const dashboardRouter = {
	getGlobalStats: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		// F-08: scope by ACTIVE membership, not by `event.ownerId`.
		// `ownerId` answers "events I created"; the dashboard answers "my
		// events", and a PARTNER or ADMIN of an event they did not create
		// must not see zeros everywhere. `dashboard.read` is held by every
		// role's read tier, so ACTIVE membership is the deciding factor here.
		const myEvent = {
			members: { some: { userId, status: "ACTIVE" as const } },
		};

		const [events, guests, invitations, suppliers, budgets, members] =
			await Promise.all([
				db.event.count({ where: myEvent }),
				db.guest.count({
					where: { event: myEvent },
				}),
				db.guestInvitation.count({
					where: { event: myEvent },
				}),
				db.supplier.count({
					where: { event: myEvent },
				}),
				db.budget.count({
					where: { event: myEvent },
				}),
				db.eventMember.count({
					where: { event: myEvent },
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
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DASHBOARD_READ,
			);

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
			await requireEventPermission(
				context.session.user.id,
				input.eventId,
				PERMISSIONS.DASHBOARD_READ,
			);
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
