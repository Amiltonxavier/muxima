import db from "@muxima/db";

export const DashboardService = {
	async getEventSummary(eventId: string) {
		const event = await db.event.findUnique({ where: { id: eventId } });
		if (!event) return null;

		const [budget, expenses, guests, tasks, inventoryItems] = await Promise.all(
			[
				db.budget.findUnique({ where: { eventId } }),
				db.expense.aggregate({
					where: { eventId },
					_sum: { totalAmount: true },
				}),
				db.guest.aggregate({ where: { eventId }, _count: true }),
				db.task.aggregate({ where: { eventId, status: "TODO" }, _count: true }),
				db.inventoryItem.findMany({ where: { eventId } }),
			],
		);

		const daysRemaining = event.eventDate
			? Math.max(
					0,
					Math.ceil(
						(event.eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
					),
				)
			: null;

		return {
			event,
			daysRemaining,
			budget: budget?.plannedAmount.toNumber() ?? 0,
			totalExpenses: expenses._sum.totalAmount?.toNumber() ?? 0,
			totalGuests: guests._count,
			pendingTasks: tasks._count,
			inventoryCount: inventoryItems.length,
		};
	},
};
