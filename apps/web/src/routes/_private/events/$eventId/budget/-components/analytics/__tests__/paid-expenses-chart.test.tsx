import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// O gráfico traz a sua própria query; o router/query context não existe neste
// render isolado, por isso o hook é substituído por um duplo controlável.
const mocks = vi.hoisted(() => ({ usePaidExpenses: vi.fn() }));

vi.mock("../../../-queries/budget-queries", () => ({
	usePaidExpenses: mocks.usePaidExpenses,
}));

import { PaidExpensesChart } from "../paid-expenses-chart";

const query = (over: Record<string, unknown> = {}) => ({
	isLoading: false,
	isError: false,
	data: [],
	refetch: vi.fn(),
	...over,
});

describe("PaidExpensesChart", () => {
	beforeEach(() => {
		mocks.usePaidExpenses.mockReset();
	});

	it("shows the loading state while the series is in flight", () => {
		mocks.usePaidExpenses.mockReturnValue(query({ isLoading: true }));

		render(<PaidExpensesChart eventId="e1" />);

		expect(screen.getByText("Despesas pagas")).toBeDefined();
		expect(screen.getByText("A carregar dados...")).toBeDefined();
	});

	it("explains the absence of data instead of drawing an empty chart", () => {
		mocks.usePaidExpenses.mockReturnValue(query({ data: [] }));

		render(<PaidExpensesChart eventId="e1" />);

		expect(screen.getByText("Ainda não há despesas pagas.")).toBeDefined();
	});

	it("offers a retry when the API fails", () => {
		const refetch = vi.fn();
		mocks.usePaidExpenses.mockReturnValue(query({ isError: true, refetch }));

		render(<PaidExpensesChart eventId="e1" />);

		expect(screen.getByText("Tentar novamente")).toBeDefined();
	});

	it("renders the aggregated series returned by the API", () => {
		mocks.usePaidExpenses.mockReturnValue(
			query({
				data: [
					{ label: "CineMuxima — Vídeo", value: 150_000 },
					{ label: "Decoração", value: 85_000 },
				],
			}),
		);

		render(<PaidExpensesChart eventId="e1" />);

		expect(screen.getByText("Despesas pagas")).toBeDefined();
		// Com dados, não cai no estado vazio nem no de carregamento.
		expect(screen.queryByText("Ainda não há despesas pagas.")).toBeNull();
		expect(screen.queryByText("A carregar dados...")).toBeNull();
	});
});
