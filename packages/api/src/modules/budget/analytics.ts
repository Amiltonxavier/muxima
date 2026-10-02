import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";
import { centsToUnits } from "../../shared/finance/money";
import type { BudgetSnapshot } from "./breakdown";
import { getBudgetSnapshot } from "./repository";

/**
 * Budget analytics. Delegates to the shared budget aggregator — the same one
 * behind `budget.getStats` and `budget.getSummary`. Nothing here sums money.
 */

export type BudgetAnalytics = {
	totalBudget: number;
	reserve: number;
	available: number;
	planned: number;
	spent: number;
	pending: number;
	overdue: number;
	remaining: number;
	usagePercentage: number;
	paymentPercentage: number;
	currency: string;
	hasTarget: boolean;
	supplierCount: number;
};

export async function getBudgetAnalytics(
	_client: PrismaClient,
	eventId: string,
	now = new Date(),
): Promise<BudgetAnalytics> {
	const snapshot: BudgetSnapshot = await getBudgetSnapshot(eventId, now);
	const { totals } = snapshot;

	return {
		totalBudget: centsToUnits(totals.totalBudget),
		reserve: centsToUnits(totals.reserve),
		available: centsToUnits(totals.available),
		planned: centsToUnits(totals.planned),
		spent: centsToUnits(totals.spent),
		pending: centsToUnits(totals.pending),
		overdue: centsToUnits(totals.overdue),
		remaining: centsToUnits(totals.remaining),
		usagePercentage: totals.usagePercentage,
		paymentPercentage: totals.paymentPercentage,
		currency: totals.currency,
		hasTarget: snapshot.hasTarget,
		supplierCount: snapshot.breakdown.bySource
			.filter((entry) => entry.key === "SUPPLIER")
			.reduce((sum, entry) => sum + entry.count, 0),
	};
}

export const budgetAnalytics = {
	get: (eventId: string) => getBudgetAnalytics(db, eventId),
};
