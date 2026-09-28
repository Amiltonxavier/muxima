import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BudgetSummary } from "../../-queries/budget-queries";
import { BudgetAnalytics } from "../budget-analytics";

const totals: BudgetSummary["totals"] = {
	totalBudget: 500_000,
	reserve: 50_000,
	available: 450_000,
	planned: 350_000,
	spent: 250_000,
	pending: 100_000,
	overdue: 85_000,
	remaining: 100_000,
	usagePercentage: 78,
	paymentPercentage: 71,
	currency: "AOA",
};

const summary: BudgetSummary = {
	totals,
	lines: [],
	hasTarget: true,
	breakdown: {
		bySource: [
			{
				key: "INVENTORY",
				label: "Inventário",
				planned: 200_000,
				paid: 150_000,
				pending: 50_000,
				percentage: 75,
				count: 4,
			},
			{
				key: "SUPPLIER",
				label: "Fornecedores",
				planned: 150_000,
				paid: 100_000,
				pending: 50_000,
				percentage: 67,
				count: 3,
			},
		],
		byCategory: [
			{
				key: "DRINK",
				label: "Bebidas",
				planned: 200_000,
				paid: 150_000,
				pending: 50_000,
				percentage: 75,
				count: 4,
			},
		],
		byPaymentStatus: [
			{
				key: "PAID",
				label: "Pago",
				planned: 150_000,
				paid: 150_000,
				pending: 0,
				percentage: 100,
				count: 2,
			},
			{
				key: "OVERDUE",
				label: "Em atraso",
				planned: 200_000,
				paid: 100_000,
				pending: 100_000,
				percentage: 50,
				count: 1,
			},
		],
		topPendingSuppliers: [
			{
				id: "s1",
				name: "Catering Bom Bom",
				category: "Comida",
				planned: 200_000,
				pending: 100_000,
				paymentStatus: "OVERDUE",
				nextDueDate: new Date("2026-02-10"),
			},
		],
		overdueSuppliers: [
			{
				id: "s1",
				name: "Catering Bom Bom",
				overdueAmount: 85_000,
				nextDueDate: new Date("2026-02-10"),
			},
		],
		monthlySpend: [
			{ month: "2026-01", amount: 75_000 },
			{ month: "2026-02", amount: 175_000 },
		],
	},
};

describe("BudgetAnalytics", () => {
	it("keeps the loading state while the summary is in flight", () => {
		render(<BudgetAnalytics isLoading isError={false} />);

		expect(screen.getByText("A carregar dados...")).toBeDefined();
	});

	it("falls back to the empty state when there is no money yet", () => {
		render(
			<BudgetAnalytics summary={null} isLoading={false} isError={false} />,
		);

		expect(screen.getByText("Nenhum registo encontrado.")).toBeDefined();
	});

	it("renders the backend totals as given, without re-deriving them", () => {
		render(
			<BudgetAnalytics summary={summary} isLoading={false} isError={false} />,
		);

		expect(screen.getByText("Aproveitamento do orçamento")).toBeDefined();
		expect(screen.getByText("78% utilizado")).toBeDefined();
		expect(screen.getByText("Pagamentos")).toBeDefined();

		// Figures straight from `totals`.
		expect(screen.getByText("500 000 Kz")).toBeDefined();
		expect(screen.getByText("450 000 Kz")).toBeDefined();
		// `spent` shows as "Gasto" in the overview and "Pago" in the gauge.
		expect(screen.getAllByText("250 000 Kz")).toHaveLength(2);
		// `overdue` shows in the gauge and again in the overdue table.
		expect(screen.getAllByText("85 000 Kz").length).toBeGreaterThan(0);
	});

	it("names every breakdown the API returned and keeps the overdue table", () => {
		render(
			<BudgetAnalytics summary={summary} isLoading={false} isError={false} />,
		);

		expect(screen.getByText("Por origem")).toBeDefined();
		expect(screen.getByText("Por categoria")).toBeDefined();
		expect(screen.getByText("Estado de pagamento")).toBeDefined();
		expect(screen.getByText("Maior pendência por fornecedor")).toBeDefined();
		expect(screen.getByText("Pagamentos por mês")).toBeDefined();
		expect(screen.getByText("Fornecedores em atraso")).toBeDefined();

		// The payment-status labels come from the API, not from a hardcoded list.
		// "Pago" and "Em atraso" are also the gauge's own row labels.
		expect(screen.getAllByText("Pago").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Em atraso").length).toBeGreaterThan(0);

		expect(screen.getByText("Catering Bom Bom")).toBeDefined();
	});

	it("explains each breakdown that came back empty instead of drawing it blank", () => {
		render(
			<BudgetAnalytics
				summary={{
					...summary,
					breakdown: {
						...summary.breakdown,
						bySource: [],
						byCategory: [],
						byPaymentStatus: [],
						topPendingSuppliers: [],
						overdueSuppliers: [],
						monthlySpend: [],
					},
				}}
				isLoading={false}
				isError={false}
			/>,
		);

		expect(screen.getByText("Sem dados por origem.")).toBeDefined();
		expect(screen.getByText("Sem dados por categoria.")).toBeDefined();
		expect(screen.getByText("Sem estados de pagamento.")).toBeDefined();
		expect(
			screen.getByText("Nenhum fornecedor com valores por pagar."),
		).toBeDefined();
		expect(
			screen.getByText("Ainda não há pagamentos registados."),
		).toBeDefined();
		expect(screen.getByText("Nenhum fornecedor em atraso.")).toBeDefined();
	});

	it("warns when the plan overshoots the available budget", () => {
		render(
			<BudgetAnalytics
				summary={{
					...summary,
					totals: { ...totals, remaining: -120_000, usagePercentage: 104 },
				}}
				isLoading={false}
				isError={false}
			/>,
		);

		expect(screen.getByText("104% utilizado")).toBeDefined();
		expect(
			screen.getByText(/O planeado ultrapassa o disponível/),
		).toBeDefined();
		expect(screen.getByText("-120 000 Kz")).toBeDefined();
	});
});
