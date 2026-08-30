import db from "@muxima/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { requireEventAccess } from "../shared/auth/event-access";

export const dashboardRouter = {
	getGlobalStats: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;

		const [events, guests, invitations, vendors, budgets, members] =
			await Promise.all([
				db.event.count({ where: { ownerId: userId } }),
				db.guest.count({
					where: { event: { ownerId: userId } },
				}),
				db.guestInvitation.count({
					where: { event: { ownerId: userId } },
				}),
				db.vendor.count({
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
			vendors,
			budgets,
			members,
		};
	}),

	getGuestChart: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const event = await db.event.findUnique({
				where: { eventId: input.eventId },
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

	getBudgetChart: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.handler(async ({ context, input }) => {
			await requireEventAccess(context.session.user.id, input.eventId);

			const budget = await db.budget.findUnique({
				where: { eventId: input.eventId },
			});

			const expenses = await db.expense.findMany({
				where: { eventId: input.eventId },
				select: { totalAmount: true, status: true },
			});

			const totalPlanned = Number(budget?.plannedAmount ?? 0);
			const reserveAmount = Number(budget?.reserveAmount ?? 0);
			const totalSpent = expenses.reduce(
				(sum, e) => sum + Number(e.totalAmount),
				0,
			);
			const totalReserved = expenses
				.filter((e) => e.status === "PLANNED")
				.reduce((sum, e) => sum + Number(e.totalAmount), 0);

			return {
				totalBudget: totalPlanned,
				reserve: reserveAmount,
				planned: totalReserved,
				spent: totalSpent,
				available: totalPlanned - totalSpent,
			};
		}),
};
