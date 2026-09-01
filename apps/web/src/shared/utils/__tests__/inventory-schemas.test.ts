import { describe, expect, it } from "vitest";
import { inventoryItemSchema, inventoryMovementSchema } from "../../../routes/_private/events/$eventId/inventory/-schema/inventory-schemas";

describe("inventoryItemSchema", () => {
	const validItem = {
		name: "Bolo de Casamento",
		category: "CAKE",
		plannedQuantity: 1,
		unit: "UNIT",
	};

	it("accepts valid item with required fields only", () => {
		const result = inventoryItemSchema.safeParse(validItem);
		expect(result.success).toBe(true);
	});

	it("accepts item with all optional fields", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			currentQuantity: 5,
			unitPrice: 250000,
			cakeType: "WEDDING_CAKE",
			weight: 12,
			deliveryDate: "2027-12-02",
			notes: "Alguma coisa",
		});
		expect(result.success).toBe(true);
	});

	it("rejects empty name", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			name: "",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const nameError = result.error.issues.find((i) =>
				i.path.includes("name"),
			);
			expect(nameError?.message).toBe("Nome do item é obrigatório");
		}
	});

	it("rejects invalid category", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			category: "INVALID",
		});
		expect(result.success).toBe(false);
	});

	it("accepts all valid categories", () => {
		const categories = ["DRINK", "FOOD", "CAKE", "DECORATION", "OTHER"];
		for (const category of categories) {
			const result = inventoryItemSchema.safeParse({
				...validItem,
				category,
			});
			expect(result.success).toBe(true);
		}
	});

	it("rejects negative plannedQuantity", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			plannedQuantity: -1,
		});
		expect(result.success).toBe(false);
	});

	it("accepts zero plannedQuantity", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			plannedQuantity: 0,
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid unit", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			unit: "INVALID",
		});
		expect(result.success).toBe(false);
	});

	it("accepts all valid units", () => {
		const units = ["UNIT", "BOX", "CASE", "BOTTLE", "KG", "LITER", "PACKAGE", "OTHER"];
		for (const unit of units) {
			const result = inventoryItemSchema.safeParse({
				...validItem,
				unit,
			});
			expect(result.success).toBe(true);
		}
	});

	it("accepts valid cakeType", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			cakeType: "WEDDING_CAKE",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid cakeType", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			cakeType: "INVALID_CAKE",
		});
		expect(result.success).toBe(false);
	});

	it("accepts undefined cakeType", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			cakeType: undefined,
		});
		expect(result.success).toBe(true);
	});

	it("rejects negative unitPrice", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			unitPrice: -100,
		});
		expect(result.success).toBe(false);
	});

	it("accepts zero unitPrice", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			unitPrice: 0,
		});
		expect(result.success).toBe(true);
	});

	it("rejects negative weight", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			weight: -5,
		});
		expect(result.success).toBe(false);
	});

	it("accepts optional fields as undefined", () => {
		const result = inventoryItemSchema.safeParse({
			...validItem,
			unitPrice: undefined,
			vendorId: undefined,
			cakeType: undefined,
			weight: undefined,
			deliveryDate: undefined,
			notes: undefined,
		});
		expect(result.success).toBe(true);
	});
});

describe("inventoryMovementSchema", () => {
	it("accepts valid movement", () => {
		const result = inventoryMovementSchema.safeParse({
			type: "CONSUMPTION",
			quantity: 5,
		});
		expect(result.success).toBe(true);
	});

	it("accepts movement with reason", () => {
		const result = inventoryMovementSchema.safeParse({
			type: "PURCHASE",
			quantity: 10,
			reason: "Compra para evento",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid type", () => {
		const result = inventoryMovementSchema.safeParse({
			type: "INVALID",
			quantity: 5,
		});
		expect(result.success).toBe(false);
	});

	it("rejects zero quantity", () => {
		const result = inventoryMovementSchema.safeParse({
			type: "CONSUMPTION",
			quantity: 0,
		});
		expect(result.success).toBe(false);
	});

	it("rejects negative quantity", () => {
		const result = inventoryMovementSchema.safeParse({
			type: "CONSUMPTION",
			quantity: -1,
		});
		expect(result.success).toBe(false);
	});

	it("accepts all valid movement types", () => {
		const types = ["PURCHASE", "ADD", "CONSUMPTION", "ADJUSTMENT", "LOSS", "RETURN"];
		for (const type of types) {
			const result = inventoryMovementSchema.safeParse({
				type,
				quantity: 1,
			});
			expect(result.success).toBe(true);
		}
	});
});
