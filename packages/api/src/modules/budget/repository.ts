import db from "@muxima/db";
import type { Prisma } from "@muxima/db/prisma";

import { toCents } from "../../shared/finance/money";
import {
	type PaymentInput,
	resolveSupplierMoney,
} from "../../shared/finance/supplier-money";
import {
	type BudgetAnalytics,
	type BudgetSnapshot,
	buildCategoryBreakdown,
	buildLines,
	buildMonthlySpend,
	buildPaymentStatusBreakdown,
	buildSourceBreakdown,
	buildTopPendingSuppliers,
	buildTotals,
	type InventoryWithMoney,
	resolveOverdueSuppliers,
	type SupplierWithMoney,
} from "./breakdown";

/**
 * Budget is a read model.
 *
 * Every figure here is derived from the two financial sources of the product:
 *   - inventory_item.unitPrice x plannedQuantity  (planned spend)
 *   - inventory_item.unitPrice x currentQuantity  (already acquired)
 *   - supplier.price / supplier payments        (committed spend)
 *
 * Nothing is summed in the browser: this module is the only place where money
 * is aggregated, and it returns plain numbers in the event currency. The
 * arithmetic itself lives in `breakdown.ts`, which is pure and unit tested.
 */

export type {
	BudgetAnalytics,
	BudgetBreakdownEntry,
	BudgetLine,
	BudgetSnapshot,
	BudgetSource,
	BudgetTotals,
	InventoryWithMoney,
	SupplierWithMoney,
} from "./breakdown";

/**
 * Loads every supplier of an event with its money already resolved by the
 * shared resolver, so the budget and the suppliers screens can never disagree.
 */
export async function loadSuppliersWithMoney(
	eventId: string,
	now = new Date(),
): Promise<SupplierWithMoney[]> {
	const suppliers = await db.supplier.findMany({
		where: { eventId },
		select: {
			id: true,
			name: true,
			category: true,
			price: true,
			status: true,
			payments: { select: { amount: true, paymentDate: true } },
			installments: {
				select: { amount: true, dueDate: true, status: true, paidAt: true },
			},
		},
	});

	return suppliers.map((supplier) => {
		const price = toCents(supplier.price);
		const payments: PaymentInput[] = supplier.payments.map((p) => ({
			amount: toCents(p.amount),
			paymentDate: p.paymentDate,
		}));
		const money = resolveSupplierMoney({
			price,
			payments,
			installments: supplier.installments.map((i) => ({
				amount: toCents(i.amount),
				dueDate: i.dueDate,
				status: i.status,
				paidAt: i.paidAt,
			})),
			now,
		});

		// A cancelled supplier is out of the budget entirely.
		if (supplier.status === "CANCELLED") {
			return {
				id: supplier.id,
				name: supplier.name,
				category: supplier.category,
				price: 0,
				paid: 0,
				pending: 0,
				paymentStatus: "CANCELLED",
				nextDueDate: null,
			};
		}

		return {
			id: supplier.id,
			name: supplier.name,
			category: supplier.category,
			price,
			paid: money.paid,
			pending: money.pending,
			paymentStatus: money.paymentStatus,
			nextDueDate: money.nextDueDate,
		};
	});
}

async function loadInventoryWithMoney(
	eventId: string,
): Promise<InventoryWithMoney[]> {
	const items = await db.inventoryItem.findMany({
		where: { eventId },
		select: {
			id: true,
			name: true,
			category: true,
			status: true,
			plannedQuantity: true,
			currentQuantity: true,
			unitPrice: true,
		},
	});

	return items.map((item) => {
		const unitPrice = toCents(item.unitPrice);
		const plannedQuantity = Number(item.plannedQuantity);
		const currentQuantity = Number(item.currentQuantity);
		const planned = Math.round(unitPrice * plannedQuantity);
		const spent = Math.round(unitPrice * currentQuantity);

		return {
			id: item.id,
			name: item.name,
			category: item.category,
			status: item.status,
			planned,
			spent,
			// Never negative: an item over-acquired reports nothing pending.
			pending: Math.max(0, planned - spent),
		};
	});
}

export async function getBudgetSnapshot(
	eventId: string,
	now = new Date(),
): Promise<BudgetSnapshot> {
	const [event, budget, inventory, suppliers] = await Promise.all([
		db.event.findUnique({ where: { id: eventId }, select: { currency: true } }),
		db.budget.findUnique({ where: { eventId } }),
		loadInventoryWithMoney(eventId),
		loadSuppliersWithMoney(eventId, now),
	]);

	const lines = buildLines(inventory, suppliers);
	const overdueSuppliers = await loadOverdueSuppliers(eventId, now);

	const totals = buildTotals({
		lines,
		totalBudget: toCents(budget?.plannedAmount),
		reserve: toCents(budget?.reserveAmount),
		overdue: overdueSuppliers.reduce((sum, s) => sum + s.overdueAmount, 0),
		currency: event?.currency ?? "AOA",
	});

	const breakdown: BudgetAnalytics = {
		byCategory: buildCategoryBreakdown(inventory, suppliers),
		bySource: buildSourceBreakdown(lines),
		byPaymentStatus: buildPaymentStatusBreakdown(suppliers),
		topPendingSuppliers: buildTopPendingSuppliers(suppliers),
		overdueSuppliers,
		monthlySpend: await loadMonthlySpend(eventId),
	};

	return { totals, lines, breakdown, hasTarget: Boolean(budget) };
}

async function loadOverdueSuppliers(eventId: string, now: Date) {
	const suppliers = await db.supplier.findMany({
		where: {
			eventId,
			status: { not: "CANCELLED" },
			installments: {
				some: {
					status: { in: ["PENDING", "OVERDUE"] },
					paidAt: null,
					dueDate: { lt: now },
				},
			},
		},
		select: {
			id: true,
			name: true,
			installments: {
				where: { paidAt: null, status: { in: ["PENDING", "OVERDUE"] } },
				select: { amount: true, dueDate: true },
				orderBy: { dueDate: "asc" },
			},
		},
	});

	return resolveOverdueSuppliers(
		suppliers.map((supplier) => ({
			id: supplier.id,
			name: supplier.name,
			installments: supplier.installments.map((i) => ({
				amount: toCents(i.amount),
				dueDate: i.dueDate,
			})),
		})),
		now,
	);
}

/**
 * Supplier spend per calendar month, taken from the recorded payment dates so
 * the chart reflects cash out rather than accruals.
 */
async function loadMonthlySpend(eventId: string) {
	const payments = await db.supplierPayment.findMany({
		where: { supplier: { eventId } },
		select: { amount: true, paymentDate: true },
		orderBy: { paymentDate: "asc" },
	});

	return buildMonthlySpend(
		payments.map((p) => ({
			amount: toCents(p.amount),
			paymentDate: p.paymentDate,
		})),
	);
}

/** Where the money goes, ordered for display. Used by the budget page. */
export async function getBudgetLines(
	eventId: string,
	filter: Prisma.InventoryItemWhereInput = {},
	now = new Date(),
) {
	const [suppliers, items] = await Promise.all([
		loadSuppliersWithMoney(eventId, now),
		db.inventoryItem.findMany({
			where: { eventId, ...filter },
			select: {
				id: true,
				name: true,
				category: true,
				status: true,
				plannedQuantity: true,
				currentQuantity: true,
				unitPrice: true,
			},
		}),
	]);

	const inventory: InventoryWithMoney[] = items.map((item) => {
		const unitPrice = toCents(item.unitPrice);
		const planned = Math.round(unitPrice * Number(item.plannedQuantity));
		const spent = Math.round(unitPrice * Number(item.currentQuantity));
		return {
			id: item.id,
			name: item.name,
			category: item.category,
			status: item.status,
			planned,
			spent,
			pending: Math.max(0, planned - spent),
		};
	});

	return buildLines(inventory, suppliers).sort((a, b) => b.planned - a.planned);
}
