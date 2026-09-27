import { describe, expect, it } from "vitest";

import {
	buildCategoryBreakdown,
	buildLines,
	buildMonthlySpend,
	buildPaymentStatusBreakdown,
	buildSourceBreakdown,
	buildTopPendingSuppliers,
	buildTotals,
	committedSuppliers,
	type InventoryWithMoney,
	monthKey,
	ratio,
	resolveOverdueSuppliers,
	type SupplierWithMoney,
} from "./breakdown";

const inventoryItem = (
	over: Partial<InventoryWithMoney> = {},
): InventoryWithMoney => ({
	id: "inv_1",
	name: "Cadeiras",
	category: "FURNITURE",
	status: "IN_PROGRESS",
	planned: 100_00,
	spent: 40_00,
	pending: 60_00,
	...over,
});

const supplier = (
	over: Partial<SupplierWithMoney> = {},
): SupplierWithMoney => ({
	id: "sup_1",
	name: "Fotógrafo",
	category: "PHOTOGRAPHER",
	price: 200_00,
	paid: 0,
	pending: 200_00,
	paymentStatus: "PENDING",
	nextDueDate: null,
	...over,
});

describe("ratio", () => {
	it("returns 0 instead of dividing by zero", () => {
		expect(ratio(10, 0)).toBe(0);
		expect(ratio(0, 0)).toBe(0);
	});

	it("rounds to a whole percentage", () => {
		expect(ratio(1, 3)).toBe(33);
		expect(ratio(2, 3)).toBe(67);
		expect(ratio(1, 2)).toBe(50);
	});

	it("never reports more than 100 even when paid exceeds planned", () => {
		expect(ratio(150, 100)).toBe(100);
	});
});

describe("buildLines", () => {
	it("turns inventory and suppliers into comparable lines", () => {
		const lines = buildLines(
			[inventoryItem()],
			[supplier({ paid: 50_00, pending: 150_00 })],
		);

		expect(lines).toHaveLength(2);
		expect(lines[0]).toMatchObject({
			source: "INVENTORY",
			planned: 100_00,
			paid: 40_00,
			pending: 60_00,
			percentage: 40,
		});
		expect(lines[1]).toMatchObject({
			source: "SUPPLIER",
			planned: 200_00,
			paid: 50_00,
			pending: 150_00,
			percentage: 25,
		});
	});

	it("reports 0% for a supplier with no price yet", () => {
		const [line] = buildLines(
			[],
			[supplier({ price: 0, paid: 100_00, pending: 0, paymentStatus: "PAID" })],
		);

		expect(line?.percentage).toBe(0);
	});

	it("leaves out a supplier that holds no money at all", () => {
		const lines = buildLines(
			[],
			[
				supplier({ id: "a", price: 0, paid: 0, pending: 0 }),
				supplier({ id: "b", price: 100_00, paid: 0, pending: 100_00 }),
			],
		);

		expect(lines.map((l) => l.id)).toEqual(["b"]);
	});
});

describe("committedSuppliers", () => {
	it("keeps a supplier with a price even when nothing was paid", () => {
		expect(
			committedSuppliers([supplier({ price: 100_00, paid: 0 })]),
		).toHaveLength(1);
	});

	it("keeps a supplier paid without an agreed price, so the cash still counts", () => {
		expect(
			committedSuppliers([supplier({ price: 0, paid: 50_00 })]).map(
				(s) => s.id,
			),
		).toEqual(["sup_1"]);
	});

	it("drops a supplier with neither price nor payments", () => {
		expect(committedSuppliers([supplier({ price: 0, paid: 0 })])).toHaveLength(
			0,
		);
	});

	it("keeps the totals aligned with the lines", () => {
		const lines = buildLines(
			[inventoryItem()],
			[
				supplier({ id: "ghost", price: 0, paid: 0, pending: 0 }),
				supplier({ id: "real", price: 200_00, paid: 50_00, pending: 150_00 }),
			],
		);
		const totals = buildTotals({
			lines,
			totalBudget: 0,
			reserve: 0,
			overdue: 0,
			currency: "AOA",
		});

		expect(totals.planned).toBe(300_00);
		expect(totals.spent).toBe(90_00);
		expect(totals.pending).toBe(210_00);
	});
});

describe("buildTotals", () => {
	const lines = buildLines(
		[inventoryItem()],
		[supplier({ paid: 100_00, pending: 100_00 })],
	);

	it("sums planned, spent and pending across both sources", () => {
		const totals = buildTotals({
			lines,
			totalBudget: 1_000_00,
			reserve: 100_00,
			overdue: 30_00,
			currency: "AOA",
		});

		expect(totals.planned).toBe(300_00);
		expect(totals.spent).toBe(140_00);
		expect(totals.pending).toBe(160_00);
		expect(totals.overdue).toBe(30_00);
		expect(totals.totalBudget).toBe(1_000_00);
		expect(totals.reserve).toBe(100_00);
		expect(totals.available).toBe(900_00);
		expect(totals.remaining).toBe(600_00);
		expect(totals.currency).toBe("AOA");
	});

	it("reports a negative remaining amount when the event is over budget", () => {
		const totals = buildTotals({
			lines: buildLines(
				[inventoryItem({ planned: 900_00, spent: 900_00, pending: 0 })],
				[],
			),
			totalBudget: 500_00,
			reserve: 0,
			overdue: 0,
			currency: "AOA",
		});

		expect(totals.remaining).toBe(-400_00);
		expect(totals.usagePercentage).toBe(100);
		// Fully settled, even though the event is over budget.
		expect(totals.paymentPercentage).toBe(100);
	});

	it("never lets a reserve larger than the target produce a negative available", () => {
		const totals = buildTotals({
			lines: [],
			totalBudget: 100_00,
			reserve: 250_00,
			overdue: 0,
			currency: "AOA",
		});

		expect(totals.available).toBe(0);
	});

	it("reports how much of the committed amount is still owed", () => {
		const totals = buildTotals({
			lines: buildLines(
				[inventoryItem({ planned: 100_00, spent: 25_00, pending: 75_00 })],
				[supplier({ price: 100_00, paid: 50_00, pending: 50_00 })],
			),
			totalBudget: 1_000_00,
			reserve: 0,
			overdue: 0,
			currency: "AOA",
		});

		expect(totals.planned).toBe(200_00);
		expect(totals.spent).toBe(75_00);
		expect(totals.paymentPercentage).toBe(38);
	});

	it("falls back to the committed spend when no target was set", () => {
		const totals = buildTotals({
			lines: buildLines([inventoryItem({ planned: 400_00 })], []),
			totalBudget: 0,
			reserve: 0,
			overdue: 0,
			currency: "AOA",
		});

		// available is 0, so the ratio would be meaningless: it falls back to
		// planned and reports the event as fully committed.
		expect(totals.usagePercentage).toBe(100);
		// 40 settled out of the 400 committed.
		expect(totals.paymentPercentage).toBe(10);
	});
});

describe("buildCategoryBreakdown", () => {
	it("groups both sources under a shared category and sorts by planned", () => {
		const entries = buildCategoryBreakdown(
			[inventoryItem({ category: "OTHER" })],
			[supplier({ category: "OTHER" })],
		);

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			key: "OTHER",
			planned: 300_00,
			paid: 40_00,
			pending: 260_00,
			count: 2,
		});
	});

	it("labels categories in pt-PT and keeps the raw key", () => {
		const [entry] = buildCategoryBreakdown(
			[inventoryItem({ category: "DRINK" })],
			[supplier({ category: "CATERING" })],
		);
		const entry2 = buildCategoryBreakdown(
			[inventoryItem({ category: "DRINK" })],
			[],
		)[0];

		expect(entry2?.key).toBe("DRINK");
		expect(entry2?.label).toBe("Bebidas");
		expect(entry).toBeDefined();
	});

	it("falls back to the key for an unknown category", () => {
		const [entry] = buildCategoryBreakdown(
			[inventoryItem({ category: "MYSTERY" })],
			[],
		);

		expect(entry?.label).toBe("MYSTERY");
	});

	it("labels the payment statuses in pt-PT", () => {
		const entries = buildPaymentStatusBreakdown([
			supplier({ id: "a", paymentStatus: "OVERDUE" }),
			supplier({ id: "b", paymentStatus: "PENDING" }),
		]);

		expect(entries.find((e) => e.key === "OVERDUE")?.label).toBe("Em atraso");
		expect(entries.find((e) => e.key === "PENDING")?.label).toBe("Por pagar");
	});

	it("orders the heaviest category first", () => {
		const entries = buildCategoryBreakdown(
			[
				inventoryItem({ id: "a", category: "LINEN", planned: 10_00 }),
				inventoryItem({ id: "b", category: "MATERIAL", planned: 900_00 }),
			],
			[],
		);

		expect(entries.map((e) => e.key)).toEqual(["MATERIAL", "LINEN"]);
	});
});

describe("buildSourceBreakdown", () => {
	it("labels the two sources in pt-PT", () => {
		const entries = buildSourceBreakdown(
			buildLines([inventoryItem()], [supplier({ paid: 200_00, pending: 0 })]),
		);

		expect(entries).toEqual([
			{
				key: "INVENTORY",
				label: "Inventário",
				planned: 100_00,
				paid: 40_00,
				pending: 60_00,
				percentage: 40,
				count: 1,
			},
			{
				key: "SUPPLIER",
				label: "Fornecedores",
				planned: 200_00,
				paid: 200_00,
				pending: 0,
				percentage: 100,
				count: 1,
			},
		]);
	});
});

describe("buildPaymentStatusBreakdown", () => {
	it("groups suppliers by their resolved payment status", () => {
		const entries = buildPaymentStatusBreakdown([
			supplier({ id: "a", paymentStatus: "PENDING" }),
			supplier({
				id: "b",
				paymentStatus: "PENDING",
				paid: 50_00,
				pending: 150_00,
			}),
			supplier({
				id: "c",
				paymentStatus: "OVERDUE",
				price: 80_00,
				paid: 0,
				pending: 80_00,
			}),
		]);

		const pending = entries.find((e) => e.key === "PENDING");
		expect(pending).toMatchObject({
			planned: 400_00,
			paid: 50_00,
			count: 2,
			percentage: 13,
		});
		expect(entries.find((e) => e.key === "OVERDUE")?.count).toBe(1);
	});
});

describe("buildTopPendingSuppliers", () => {
	it("keeps the biggest outstanding amounts and drops the settled ones", () => {
		const ranked = buildTopPendingSuppliers([
			supplier({ id: "small", name: "Pequeno", pending: 10_00 }),
			supplier({ id: "big", name: "Grande", pending: 900_00 }),
			supplier({ id: "done", name: "Quitado", pending: 0, paid: 200_00 }),
		]);

		expect(ranked.map((s) => s.id)).toEqual(["big", "small"]);
	});

	it("honours the limit", () => {
		const many = Array.from({ length: 9 }, (_, i) =>
			supplier({ id: `s${i}`, pending: (i + 1) * 100 }),
		);

		expect(buildTopPendingSuppliers(many)).toHaveLength(5);
	});
});

describe("resolveOverdueSuppliers", () => {
	const now = new Date("2026-06-15T00:00:00.000Z");

	it("counts only installments that are genuinely late", () => {
		const result = resolveOverdueSuppliers(
			[
				{
					id: "sup_1",
					name: "Banda",
					installments: [
						{ amount: 100_00, dueDate: new Date("2026-01-10T00:00:00.000Z") },
						{ amount: 50_00, dueDate: new Date("2026-12-01T00:00:00.000Z") },
					],
				},
			],
			now,
		);

		expect(result[0]?.overdueAmount).toBe(100_00);
		expect(result[0]?.nextDueDate).toEqual(
			new Date("2026-01-10T00:00:00.000Z"),
		);
	});

	it("reports nothing overdue when every due date is still ahead", () => {
		const result = resolveOverdueSuppliers(
			[
				{
					id: "sup_1",
					name: "Catering",
					installments: [
						{ amount: 100_00, dueDate: new Date("2026-07-01T00:00:00.000Z") },
					],
				},
			],
			now,
		);

		expect(result[0]?.overdueAmount).toBe(0);
	});

	it("treats a due date exactly at now as not yet overdue", () => {
		const result = resolveOverdueSuppliers(
			[
				{
					id: "sup_1",
					name: "Limite",
					installments: [{ amount: 10_00, dueDate: now }],
				},
			],
			now,
		);

		expect(result[0]?.overdueAmount).toBe(0);
	});
});

describe("buildMonthlySpend", () => {
	it("groups payments by UTC month and orders chronologically", () => {
		const spend = buildMonthlySpend([
			{ amount: 100_00, paymentDate: new Date("2026-02-20T23:59:59.000Z") },
			{ amount: 50_00, paymentDate: new Date("2026-01-05T00:00:00.000Z") },
			{ amount: 25_00, paymentDate: new Date("2026-01-31T00:00:00.000Z") },
		]);

		expect(spend).toEqual([
			{ month: "2026-01", amount: 75_00 },
			{ month: "2026-02", amount: 100_00 },
		]);
	});

	it("formats January with a leading zero", () => {
		expect(monthKey(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01");
	});

	it("returns nothing when no payment was recorded", () => {
		expect(buildMonthlySpend([])).toEqual([]);
	});
});
