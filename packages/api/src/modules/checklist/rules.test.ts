import { describe, expect, it } from "vitest";

import {
	resolveInventoryChecklistStatus,
	resolveSupplierChecklistStatus,
} from "./rules";

/**
 * These are the rules the API owns: the client never decides whether a
 * supplier or an inventory item counts as done.
 */

describe("resolveSupplierChecklistStatus", () => {
	it("is pending while the supplier is still a prospect", () => {
		expect(
			resolveSupplierChecklistStatus({
				supplierStatus: "PROSPECT",
				price: 100_00,
				paid: 0,
			}),
		).toBe("PENDING");
	});

	it("is pending when confirmed but not paid yet", () => {
		expect(
			resolveSupplierChecklistStatus({
				supplierStatus: "CONFIRMED",
				price: 100_00,
				paid: 0,
			}),
		).toBe("IN_PROGRESS");
	});

	it("is in progress while a confirmed supplier is partially paid", () => {
		expect(
			resolveSupplierChecklistStatus({
				supplierStatus: "CONFIRMED",
				price: 100_00,
				paid: 40_00,
			}),
		).toBe("IN_PROGRESS");
	});

	it("is completed only when confirmed and fully paid", () => {
		expect(
			resolveSupplierChecklistStatus({
				supplierStatus: "CONFIRMED",
				price: 100_00,
				paid: 100_00,
			}),
		).toBe("COMPLETED");
	});

	it("is not completed when fully paid but never confirmed", () => {
		expect(
			resolveSupplierChecklistStatus({
				supplierStatus: "NEGOTIATING",
				price: 100_00,
				paid: 100_00,
			}),
		).toBe("PENDING");
	});

	it("a cancelled supplier is never complete, even when paid in full", () => {
		expect(
			resolveSupplierChecklistStatus({
				supplierStatus: "CANCELLED",
				price: 100_00,
				paid: 100_00,
			}),
		).toBe("CANCELLED");
	});

	it("treats any payment as completion when no price was agreed", () => {
		expect(
			resolveSupplierChecklistStatus({
				supplierStatus: "CONFIRMED",
				price: 0,
				paid: 1,
			}),
		).toBe("COMPLETED");

		expect(
			resolveSupplierChecklistStatus({
				supplierStatus: "CONFIRMED",
				price: 0,
				paid: 0,
			}),
		).toBe("IN_PROGRESS");
	});
});

describe("resolveInventoryChecklistStatus", () => {
	it("is pending for a fresh item", () => {
		expect(
			resolveInventoryChecklistStatus({
				itemStatus: "PENDING",
				plannedQuantity: 10,
				currentQuantity: 0,
			}),
		).toBe("PENDING");
	});

	it("is in progress once some units are acquired", () => {
		expect(
			resolveInventoryChecklistStatus({
				itemStatus: "IN_PROGRESS",
				plannedQuantity: 10,
				currentQuantity: 4,
			}),
		).toBe("IN_PROGRESS");
	});

	it("is completed when the item itself is completed", () => {
		expect(
			resolveInventoryChecklistStatus({
				itemStatus: "COMPLETED",
				plannedQuantity: 10,
				currentQuantity: 7,
			}),
		).toBe("COMPLETED");
	});

	it("is completed when the planned quantity is reached, even if the status lagged", () => {
		expect(
			resolveInventoryChecklistStatus({
				itemStatus: "IN_PROGRESS",
				plannedQuantity: 10,
				currentQuantity: 10,
			}),
		).toBe("COMPLETED");
	});

	it("never divides by zero for an item with no planned quantity", () => {
		expect(
			resolveInventoryChecklistStatus({
				itemStatus: "PENDING",
				plannedQuantity: 0,
				currentQuantity: 0,
			}),
		).toBe("PENDING");
	});
});
