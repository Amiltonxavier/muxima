import db from "@muxima/db";
import { centsToUnits } from "../../shared/finance/money";
import { getBudgetSnapshot } from "../budget/repository";

/**
 * Legacy REST summary, kept for the dashboard endpoint. The money figures come
 * from the shared budget aggregator so this route cannot drift from the oRPC
 * dashboard router.
 */
export const DashboardService = {
	async getEventSummary(eventId: string) {
		const event = await db.event.findUnique({ where: { id: eventId } });
		if (!event) return null;

		const [snapshot, guests, tasks, inventoryItems, suppliers] =
			await Promise.all([
				getBudgetSnapshot(eventId),
				db.guest.aggregate({ where: { eventId }, _count: true }),
				db.task.aggregate({ where: { eventId, status: "TODO" }, _count: true }),
				db.inventoryItem.count({ where: { eventId } }),
				db.supplier.count({ where: { eventId } }),
			]);

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
			budget: centsToUnits(snapshot.totals.totalBudget),
			planned: centsToUnits(snapshot.totals.planned),
			totalSpent: centsToUnits(snapshot.totals.spent),
			totalPending: centsToUnits(snapshot.totals.pending),
			totalOverdue: centsToUnits(snapshot.totals.overdue),
			currency: snapshot.totals.currency,
			totalGuests: guests._count,
			pendingTasks: tasks._count,
			inventoryCount: inventoryItems,
			supplierCount: suppliers,
		};
	},
};
