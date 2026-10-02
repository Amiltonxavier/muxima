import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";
import { isOverdue } from "../../shared/finance/supplier-money";
import { getFoodPlanStats } from "../food-plan/stats";

/**
 * Checklist analytics.
 *
 * Extracted from the `checklist` router, which now delegates here. Overdue uses
 * the shared `isOverdue` rule so checklist, tasks and suppliers cannot disagree
 * about what "atrasado" means.
 */

export type ChecklistAnalytics = {
	total: number;
	completed: number;
	pending: number;
	inProgress: number;
	cancelled: number;
	completionPercentage: number;
	overdue: number;
	autoManaged: number;
	linkedToSupplier: number;
	linkedToInventory: number;
	foodPlan: {
		totalItems: number;
		completedItems: number;
		completionPercentage: number;
	};
};

export async function getChecklistAnalytics(
	client: PrismaClient,
	eventId: string,
	now = new Date(),
): Promise<ChecklistAnalytics> {
	const [items, foodPlan] = await Promise.all([
		client.checklistItem.findMany({
			where: { eventId },
			select: {
				status: true,
				autoManaged: true,
				supplierId: true,
				inventoryItemId: true,
				dueDate: true,
			},
		}),
		getFoodPlanStats(eventId),
	]);

	const total = items.length;
	const completed = items.filter((i) => i.status === "COMPLETED").length;

	return {
		total,
		completed,
		pending: items.filter((i) => i.status === "PENDING").length,
		inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
		cancelled: items.filter((i) => i.status === "CANCELLED").length,
		completionPercentage:
			total === 0 ? 0 : Math.round((completed / total) * 100),
		autoManaged: items.filter((i) => i.autoManaged).length,
		linkedToSupplier: items.filter((i) => i.supplierId).length,
		linkedToInventory: items.filter((i) => i.inventoryItemId).length,
		// A null due date is never overdue; the shared helper takes a Date only.
		overdue: items.filter((item) => {
			if (!item.dueDate) return false;
			const settled =
				item.status === "COMPLETED" || item.status === "CANCELLED";
			return isOverdue(item.dueDate, settled, now);
		}).length,
		foodPlan: {
			totalItems: foodPlan.totalItems,
			completedItems: foodPlan.completedItems,
			completionPercentage: foodPlan.completionPercentage,
		},
	};
}

export const checklistAnalytics = {
	get: (eventId: string) => getChecklistAnalytics(db, eventId),
};
