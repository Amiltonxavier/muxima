import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// O gráfico traz a sua própria query; o router/query context não existe neste
// render isolado, por isso o hook é substituído por um duplo controlável.
const mocks = vi.hoisted(() => ({ useInventoryCostliestItems: vi.fn() }));

vi.mock("../../-queries/inventory-queries", () => ({
	useInventoryCostliestItems: mocks.useInventoryCostliestItems,
}));

import { InventoryCostliestChart } from "../inventory-costliest-chart";

const query = (over: Record<string, unknown> = {}) => ({
	isLoading: false,
	isError: false,
	data: [],
	refetch: vi.fn(),
	...over,
});

describe("InventoryCostliestChart", () => {
	beforeEach(() => {
		mocks.useInventoryCostliestItems.mockReset();
	});

	it("shows the loading state while the series is in flight", () => {
		mocks.useInventoryCostliestItems.mockReturnValue(
			query({ isLoading: true }),
		);

		render(<InventoryCostliestChart eventId="e1" />);

		expect(screen.getByText("Itens mais caros")).toBeDefined();
		expect(screen.getByText("A carregar dados...")).toBeDefined();
	});

	it("explains the absence of data instead of drawing an empty chart", () => {
		mocks.useInventoryCostliestItems.mockReturnValue(query({ data: [] }));

		render(<InventoryCostliestChart eventId="e1" />);

		expect(
			screen.getByText("Ainda não há itens com custo definido."),
		).toBeDefined();
	});

	it("offers a retry when the API fails", () => {
		const refetch = vi.fn();
		mocks.useInventoryCostliestItems.mockReturnValue(
			query({ isError: true, refetch }),
		);

		render(<InventoryCostliestChart eventId="e1" />);

		expect(screen.getByText("Tentar novamente")).toBeDefined();
	});

	it("renders the ranked series returned by the API", () => {
		mocks.useInventoryCostliestItems.mockReturnValue(
			query({
				data: [
					{ label: "Vinho tinto", value: 135_000 },
					{ label: "Mesa", value: 120_000 },
				],
			}),
		);

		render(<InventoryCostliestChart eventId="e1" />);

		expect(screen.getByText("Itens mais caros")).toBeDefined();
		// Com dados, não cai no estado vazio nem no de carregamento.
		expect(
			screen.queryByText("Ainda não há itens com custo definido."),
		).toBeNull();
		expect(screen.queryByText("A carregar dados...")).toBeNull();
	});
});
