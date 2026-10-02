import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";
import { centsToUnits } from "../../shared/finance/money";
import { loadSuppliersWithMoney } from "../budget/repository";

/**
 * Supplier analytics.
 *
 * Money comes from the shared budget resolver (`loadSuppliersWithMoney`), so the
 * suppliers screen, the budget screen and this report can never disagree on
 * what is paid or pending.
 */

export type SupplierAnalytics = {
	total: number;
	confirmed: number;
	pending: number;
	cancelled: number;
	completed: number;
	overdueCount: number;
	paidCount: number;
	totalPrice: number;
	totalPaid: number;
	totalPending: number;
	byCategory: {
		key: string;
		count: number;
		planned: number;
		pending: number;
	}[];
	byPaymentStatus: Record<string, number>;
};

type Db = PrismaClient;

/**
 * Money comes from the shared resolver, which owns its own query; the lifecycle
 * status counts are read through the caller-supplied client.
 */
export async function getSupplierAnalytics(
	client: Db,
	eventId: string,
	now = new Date(),
): Promise<SupplierAnalytics> {
	const suppliers = await loadSuppliersWithMoney(eventId, now);

	const sum = (pick: (supplier: (typeof suppliers)[number]) => number) =>
		suppliers.reduce((total, supplier) => total + pick(supplier), 0);

	const byCategory = new Map<
		string,
		{ key: string; count: number; planned: number; pending: number }
	>();
	for (const supplier of suppliers) {
		const entry = byCategory.get(supplier.category) ?? {
			key: supplier.category,
			count: 0,
			planned: 0,
			pending: 0,
		};
		entry.count += 1;
		entry.planned += supplier.price;
		entry.pending += supplier.pending;
		byCategory.set(supplier.category, entry);
	}

	const byPaymentStatus: Record<string, number> = {};
	for (const supplier of suppliers) {
		byPaymentStatus[supplier.paymentStatus] =
			(byPaymentStatus[supplier.paymentStatus] ?? 0) + 1;
	}

	// `SupplierWithMoney` intentionally carries no lifecycle status (money is the
	// resolver's concern), so the counts are read from the rows directly.
	const statusRows = await client.supplier.findMany({
		where: { eventId },
		select: { status: true },
	});
	const byStatus = new Map<string, number>();
	for (const row of statusRows) {
		byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
	}
	const statusOf = (key: string) => byStatus.get(key) ?? 0;

	return {
		total: statusRows.length,
		confirmed: statusOf("CONFIRMED"),
		pending: statusRows.length - statusOf("CONFIRMED") - statusOf("COMPLETED"),
		completed: statusOf("COMPLETED"),
		cancelled: statusOf("CANCELLED"),
		overdueCount: suppliers.filter((s) => s.paymentStatus === "OVERDUE").length,
		paidCount: suppliers.filter((s) => s.paymentStatus === "PAID").length,
		totalPrice: centsToUnits(sum((s) => s.price)),
		totalPaid: centsToUnits(sum((s) => s.paid)),
		totalPending: centsToUnits(sum((s) => s.pending)),
		byCategory: [...byCategory.values()]
			.map((entry) => ({
				...entry,
				planned: centsToUnits(entry.planned),
				pending: centsToUnits(entry.pending),
			}))
			.sort((a, b) => b.planned - a.planned),
		byPaymentStatus,
	};
}

export const supplierAnalytics = {
	get: (eventId: string) => getSupplierAnalytics(db, eventId),
};
