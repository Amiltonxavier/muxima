import { describe, expect, it } from "vitest";

import {
	addQuantitySchema,
	inventoryItemSchema,
	inventoryMovementSchema,
} from "../inventory-schemas";

describe("inventoryItemSchema", () => {
	it("accepts a valid item", () => {
		const result = inventoryItemSchema.safeParse({
			name: "Cadeiras",
			category: "OTHER",
			unit: "UNIT",
			plannedQuantity: 300,
			venueQuantity: 280,
			unitPrice: 10_000,
		});

		expect(result.success).toBe(true);
	});

	it("rejects venue quantity above planned quantity", () => {
		const result = inventoryItemSchema.safeParse({
			name: "Cadeiras",
			category: "OTHER",
			unit: "UNIT",
			plannedQuantity: 10,
			venueQuantity: 20,
		});

		expect(result.success).toBe(false);
	});

	it("rejects a blank name", () => {
		const result = inventoryItemSchema.safeParse({
			name: "",
			category: "OTHER",
			unit: "UNIT",
			plannedQuantity: 10,
			venueQuantity: 0,
		});

		expect(result.success).toBe(false);
	});

	it("rejects a non-positive planned quantity", () => {
		const result = inventoryItemSchema.safeParse({
			name: "Cadeiras",
			category: "OTHER",
			unit: "UNIT",
			plannedQuantity: 0,
			venueQuantity: 0,
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

	it("accepts an addition with only the quantity", () => {
		const result = addQuantitySchema.safeParse({ quantity: 2 });

		expect(result.success).toBe(true);
	});

	it("rejects a non-positive quantity", () => {
		const result = addQuantitySchema.safeParse({ quantity: 0 });

		expect(result.success).toBe(false);
	});
});

describe("inventoryMovementSchema", () => {
	it("accepts a valid movement", () => {
		const result = inventoryMovementSchema.safeParse({
			type: "ADD",
			quantity: 2,
			unitPrice: 10_000,
		});

		expect(result.success).toBe(true);
	});

	it("rejects a non-positive quantity", () => {
		const result = inventoryMovementSchema.safeParse({
			type: "ADD",
			quantity: 0,
		});

		expect(result.success).toBe(false);
	});

	it("rejects an unknown movement type", () => {
		const result = inventoryMovementSchema.safeParse({
			type: "TRANSFER",
			quantity: 2,
		});

		expect(result.success).toBe(false);
	});
});
