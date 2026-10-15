import { describe, expect, it } from "vitest";

import { buildCostliestItems } from "./analytics";

describe("buildCostliestItems", () => {
	it("ranks the items by total cost, heaviest first", () => {
		const result = buildCostliestItems([
			{ name: "Guardanapos", plannedQuantity: 200, unitPrice: 150 },
			{ name: "Vinho", plannedQuantity: 30, unitPrice: 4_500 },
			{ name: "Mesa", plannedQuantity: 10, unitPrice: 12_000 },
		]);

		expect(result).toEqual([
			{ label: "Vinho", value: 135_000 },
			{ label: "Mesa", value: 120_000 },
			{ label: "Guardanapos", value: 30_000 },
		]);
	});

	it("drops items without a price or without value", () => {
		const result = buildCostliestItems([
			{ name: "Sem preço", plannedQuantity: 10, unitPrice: null },
			{ name: "Vinho", plannedQuantity: 30, unitPrice: 4_500 },
			{ name: "Sem custo", plannedQuantity: 0, unitPrice: 1_000 },
		]);

		expect(result).toEqual([{ label: "Vinho", value: 135_000 }]);
	});

	it("keeps only the most expensive `limit` items", () => {
		const result = buildCostliestItems(
			[
				{ name: "A", plannedQuantity: 1, unitPrice: 100 },
				{ name: "B", plannedQuantity: 1, unitPrice: 200 },
				{ name: "C", plannedQuantity: 1, unitPrice: 300 },
			],
			2,
		);

		expect(result).toEqual([
			{ label: "C", value: 300 },
			{ label: "B", value: 200 },
		]);
	});

	it("rounds the cost to two decimals and never mutates the input", () => {
		const input = [{ name: "Arroz", plannedQuantity: 3, unitPrice: 0.1 }];

		expect(buildCostliestItems(input)).toEqual([
			{ label: "Arroz", value: 0.3 },
		]);
		expect(input[0]?.name).toBe("Arroz");
	});

	it("returns an empty series when there is nothing to rank", () => {
		expect(buildCostliestItems([])).toEqual([]);
	});
});
