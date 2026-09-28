import { describe, expect, it } from "vitest";

import { addQuantitySchema, inventoryItemSchema } from "../inventory-schemas";

describe("inventoryItemSchema", () => {
	it("accepts a valid item", () => {
		const result = inventoryItemSchema.safeParse({
			name: "Cadeiras",
			category: "OTHER",
			unit: "UNIT",
			plannedQuantity: 300,
			unitPrice: 10_000,
		});

		expect(result.success).toBe(true);
	});

	it("rejects a blank name", () => {
		const result = inventoryItemSchema.safeParse({
			name: "",
			category: "OTHER",
			unit: "UNIT",
			plannedQuantity: 10,
		});

		expect(result.success).toBe(false);
	});

	it("rejects a non-positive planned quantity", () => {
		const result = inventoryItemSchema.safeParse({
			name: "Cadeiras",
			category: "OTHER",
			unit: "UNIT",
			plannedQuantity: 0,
		});

		expect(result.success).toBe(false);
	});
});

describe("addQuantitySchema", () => {
	it("accepts an addition with unit price and reason", () => {
		const result = addQuantitySchema.safeParse({
			quantity: 2,
			unitPrice: 10_000,
			reason: "Primeira entrada",
		});

		expect(result.success).toBe(true);
	});
});
