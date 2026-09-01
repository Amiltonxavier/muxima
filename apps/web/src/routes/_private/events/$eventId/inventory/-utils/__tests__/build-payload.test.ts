import { describe, expect, it } from "vitest";
import { buildPayload } from "../index";

describe("buildPayload", () => {
	it("builds payload with all fields from database item", () => {
		const data = {
			id: "item-123",
			name: "Bolo de Casamento 4 Andares",
			category: "CAKE",
			plannedQuantity: 1,
			currentQuantity: 0,
			unit: "UNIT",
			unitPrice: 250000,
			cakeType: "WEDDING_CAKE",
			weight: 12,
			deliveryDate: "2027-12-02T00:00:00.000Z",
			notes: "Alguma coisa",
		};

		const result = buildPayload(data);

		expect(result.id).toBe("item-123");
		expect(result.name).toBe("Bolo de Casamento 4 Andares");
		expect(result.category).toBe("CAKE");
		expect(result.plannedQuantity).toBe(1);
		expect(result.currentQuantity).toBe(0);
		expect(result.unit).toBe("UNIT");
		expect(result.unitPrice).toBe(250000);
		expect(result.cakeType).toBe("WEDDING_CAKE");
		expect(result.weight).toBe(12);
		expect(result.deliveryDate).toBe("2027-12-02");
		expect(result.notes).toBe("Alguma coisa");
	});

	it("returns undefined for optional fields when not present", () => {
		const data = {
			id: "item-456",
			name: "Sumo de Laranja",
			category: "DRINK",
			plannedQuantity: 20,
			currentQuantity: 10,
			unit: "BOTTLE",
			unitPrice: 500,
			notes: "",
		};

		const result = buildPayload(data);

		expect(result.cakeType).toBeUndefined();
		expect(result.weight).toBeUndefined();
		expect(result.deliveryDate).toBeUndefined();
	});

	it("falls back to event eventDate when deliveryDate is not present", () => {
		const data = {
			id: "item-789",
			name: "Item",
			category: "FOOD",
			plannedQuantity: 1,
			currentQuantity: 0,
			unit: "UNIT",
			event: {
				eventDate: "2027-08-15T00:00:00.000Z",
			},
		};

		const result = buildPayload(data);

		expect(result.deliveryDate).toBe("2027-08-15");
	});

	it("prefers deliveryDate over event eventDate", () => {
		const data = {
			id: "item-999",
			name: "Item",
			category: "FOOD",
			plannedQuantity: 1,
			currentQuantity: 0,
			unit: "UNIT",
			deliveryDate: "2027-10-01T00:00:00.000Z",
			event: {
				eventDate: "2027-08-15T00:00:00.000Z",
			},
		};

		const result = buildPayload(data);

		expect(result.deliveryDate).toBe("2027-10-01");
	});

	it("returns undefined for cakeType when empty string", () => {
		const data = {
			id: "item-789",
			name: "Item",
			category: "FOOD",
			plannedQuantity: 1,
			currentQuantity: 0,
			unit: "UNIT",
			unitPrice: 0,
			cakeType: "",
			weight: 0,
			deliveryDate: "",
			notes: "",
		};

		const result = buildPayload(data);

		expect(result.cakeType).toBeUndefined();
		expect(result.weight).toBeUndefined();
		expect(result.deliveryDate).toBeUndefined();
	});

	it("uses default values for missing fields", () => {
		const data = {};

		const result = buildPayload(data);

		expect(result.id).toBe("");
		expect(result.name).toBe("");
		expect(result.category).toBe("OTHER");
		expect(result.plannedQuantity).toBe(0);
		expect(result.currentQuantity).toBe(0);
		expect(result.unit).toBe("UNIT");
		expect(result.unitPrice).toBe(0);
		expect(result.notes).toBe("");
	});

	it("converts string numbers properly", () => {
		const data = {
			id: "1",
			name: "Test",
			category: "DRINK",
			plannedQuantity: "15",
			currentQuantity: "8",
			unitPrice: "1500",
			weight: "2.5",
		};

		const result = buildPayload(data);

		expect(result.plannedQuantity).toBe(15);
		expect(result.currentQuantity).toBe(8);
		expect(result.unitPrice).toBe(1500);
		expect(result.weight).toBe(2.5);
	});

	it("formats deliveryDate to YYYY-MM-DD", () => {
		const data = {
			deliveryDate: "2027-06-15T12:00:00.000Z",
		};

		const result = buildPayload(data);

		expect(result.deliveryDate).toBe("2027-06-15");
	});

	it("returns id as empty string when not present", () => {
		const data = { name: "Item" };

		const result = buildPayload(data);

		expect(result.id).toBe("");
	});
});
