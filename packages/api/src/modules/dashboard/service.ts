import db from "@muxima/db";

import { centsToUnits } from "../../shared/finance/money";
import { getEventSummaryAnalytics } from "./event-analytics";

/**
 * Legacy REST summary, kept for the dashboard endpoint.
 *
 * It no longer derives anything: every figure is read from the shared event
 * aggregation, so this route cannot drift from the oRPC routers nor from the
 * event summary report. New consumers should read `getEventSummaryAnalytics`
 * directly instead of adding fields here.
 */
export const DashboardService = {
	async getEventSummary(eventId: string, userId: string) {
		const summary = await getEventSummaryAnalytics(db, eventId, userId);
		if (!summary) return null;

		const { event, guests, budget, tasks, inventory, suppliers, countdown } =
			summary;

		return {
			event,
			daysRemaining:
				countdown.hasDate && !countdown.isPast ? countdown.daysRemaining : null,
			budget: centsToUnits(budget.totalBudget),
			planned: centsToUnits(budget.planned),
			totalSpent: centsToUnits(budget.spent),
			totalPending: centsToUnits(budget.pending),
			totalOverdue: centsToUnits(budget.overdue),
			currency: budget.currency,
			totalGuests: guests.totalGuests,
			pendingTasks: tasks.byStatus.TODO,
			inventoryCount: inventory.totalItems,
			supplierCount: suppliers.total,
		};
	},
};
