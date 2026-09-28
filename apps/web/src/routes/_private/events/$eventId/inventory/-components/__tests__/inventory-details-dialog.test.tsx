import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatCurrency } from "@/utils/format-currency";
import { InventoryDetailsDialog } from "../inventory-details-dialog";

const useInventoryItem = vi.fn();

vi.mock("@/shared/queries/inventory-queries", () => ({
	useInventoryItem: (id: string) => useInventoryItem(id),
}));

const item = {
	id: "item-1",
	name: "Cerveja-lata 33cl",
	category: "DRINK",
	unit: "UNIT",
	status: "PENDING",
	plannedQuantity: 240,
	currentQuantity: 160,
	remainingQuantity: 80,
	completionPercentage: 67,
	unitPrice: 1_500,
	totalValue: 360_000,
	completedValue: 240_000,
	pendingValue: 120_000,
	notes: null,
	createdAt: new Date("2026-01-10T09:00:00Z"),
	updatedAt: new Date("2026-02-11T09:00:00Z"),
};

function renderDialog() {
	return render(
		<InventoryDetailsDialog open onOpenChange={() => {}} itemId="item-1" />,
	);
}

/**
 * `getByText` normalises the DOM text but not the matcher (`matches.js` compares
 * `normalizedText === String(matcher)`). `formatCurrency` separates thousands
 * with a non-breaking space, which the normaliser turns into a plain space on
 * one side only — so the expected string has to be collapsed the same way.
 */
function expected(text: string) {
	return text.replace(/\s/g, " ");
}

beforeEach(() => {
	vi.clearAllMocks();
	useInventoryItem.mockReturnValue({
		data: item,
		isLoading: false,
		isError: false,
	});
});

describe("InventoryDetailsDialog", () => {
	it("shows the quantities as a pie with the API percentage in the hole", () => {
		renderDialog();

		// Slice values come straight from the API, never recomputed here.
		expect(screen.getByText("Concluído")).toBeInTheDocument();
		expect(screen.getByText("Em falta")).toBeInTheDocument();
		expect(screen.getByText("67%")).toBeInTheDocument();
		expect(screen.getByText(/Planeado: 240/)).toBeInTheDocument();
	});

	it("spells out the operands behind each derived money figure", () => {
		renderDialog();

		const price = formatCurrency(item.unitPrice);
		expect(
			screen.getByText(expected(`${item.plannedQuantity} × ${price}`)),
		).toBeInTheDocument();
		expect(
			screen.getByText(expected(`${item.currentQuantity} × ${price}`)),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				expected(
					`${formatCurrency(item.totalValue)} − ${formatCurrency(item.completedValue)}`,
				),
			),
		).toBeInTheDocument();
	});

	it("hides the formulas when the item has no unit price", () => {
		// Guard against a vacuous pass: the signs are really there with a price.
		renderDialog();
		expect(screen.getAllByText(/×/)).toHaveLength(2);
		expect(screen.getAllByText(/−/)).toHaveLength(1);
	});

	it("drops the formulas once the unit price is gone", () => {
		useInventoryItem.mockReturnValue({
			data: { ...item, unitPrice: null },
			isLoading: false,
			isError: false,
		});
		renderDialog();

		expect(screen.getByText("—")).toBeInTheDocument();
		// Regex matchers run against the normalised text, and neither sign is
		// whitespace, so they are safe to assert on directly.
		expect(screen.queryByText(/×/)).not.toBeInTheDocument();
		expect(screen.queryByText(/−/)).not.toBeInTheDocument();
	});
});
