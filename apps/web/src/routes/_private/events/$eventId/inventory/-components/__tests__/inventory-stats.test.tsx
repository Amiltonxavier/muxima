import type { InventoryStats as InventoryStatsDto } from "@muxima/api/shared/types/entities";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { InventoryStats } from "../inventory-stats";
import { InventoryTable } from "../inventory-table";

const stats: InventoryStatsDto = {
	totalItems: 8,
	totalQuantity: 400,
	totalCurrent: 320,
	totalVenue: 280,
	totalRemaining: 80,
	completionPercentage: 80,
	totalValue: 4_000_000,
	completedValue: 3_200_000,
	pendingValue: 800_000,
	completedItems: 3,
	inProgressItems: 4,
	pendingItems: 1,
};

describe("InventoryStats", () => {
	it("renders the KPIs exactly as provided by the backend", () => {
		render(<InventoryStats stats={stats} />);

		expect(screen.getByText("Total de produtos")).toBeDefined();
		expect(screen.getByText("Qtd. planeada")).toBeDefined();
		expect(screen.getByText("Em falta")).toBeDefined();
		expect(screen.getByText("Para o salão")).toBeDefined();

		expect(screen.getByText("400")).toBeDefined();
		expect(screen.getByText("320")).toBeDefined();
		expect(screen.getByText("80%")).toBeDefined();
	});

	it("renders nothing when no stats are loaded yet", () => {
		const { container } = render(<InventoryStats />);

		expect(container.firstChild).toBeNull();
	});
});

describe("InventoryTable", () => {
	const handlers = {
		onViewItem: vi.fn(),
		onEditItem: vi.fn(),
		onAddQuantity: vi.fn(),
		onViewHistory: vi.fn(),
		onDeleteItem: vi.fn(),
	};

	it("renders the loading state", () => {
		render(
			<InventoryTable
				items={[]}
				isLoading
				isError={false}
				hasActiveFilters={false}
				{...handlers}
			/>,
		);

		expect(screen.getByText("A carregar dados...")).toBeDefined();
	});

	it("differentiates the empty state from the filtered empty state", () => {
		const { rerender } = render(
			<InventoryTable
				items={[]}
				isLoading={false}
				isError={false}
				hasActiveFilters={false}
				{...handlers}
			/>,
		);

		expect(
			screen.getByText("Ainda não existem itens no inventário."),
		).toBeDefined();

		rerender(
			<InventoryTable
				items={[]}
				isLoading={false}
				isError={false}
				hasActiveFilters
				{...handlers}
			/>,
		);

		expect(
			screen.getByText("Nenhum resultado para os filtros aplicados."),
		).toBeDefined();
	});

	it("renders the error state with a message and next action", () => {
		render(
			<InventoryTable
				items={[]}
				isLoading={false}
				isError
				hasActiveFilters={false}
				{...handlers}
			/>,
		);

		expect(
			screen.getByText(
				"Não foi possível carregar o inventário. Tente novamente.",
			),
		).toBeDefined();
	});

	it("renders the rows returned by the backend", () => {
		const item = {
			id: "inv_1",
			eventId: "evt_1",
			name: "Cadeiras",
			category: "OTHER" as const,
			unit: "UNIT" as const,
			status: "IN_PROGRESS" as const,
			plannedQuantity: 300,
			currentQuantity: 280,
			venueQuantity: 280,
			remainingQuantity: 20,
			completionPercentage: 93,
			unitPrice: 10_000,
			totalValue: 3_000_000,
			completedValue: 2_800_000,
			pendingValue: 200_000,
			vendorId: null,
			vendor: null,
			notes: null,
			createdAt: new Date("2026-09-01T10:00:00.000Z"),
			updatedAt: new Date("2026-09-20T10:00:00.000Z"),
		};

		render(
			<InventoryTable
				items={[item]}
				isLoading={false}
				isError={false}
				hasActiveFilters={false}
				{...handlers}
			/>,
		);

		expect(screen.getByText("Cadeiras")).toBeDefined();
		expect(screen.getByText("300")).toBeDefined();
		expect(screen.getByText("20")).toBeDefined();
		expect(screen.getByText("93%")).toBeDefined();
	});

	it("disables adding quantity when the item is fully planned", () => {
		const item = {
			id: "inv_2",
			eventId: "evt_1",
			name: "Champanhe",
			category: "DRINK" as const,
			unit: "BOTTLE" as const,
			status: "COMPLETED" as const,
			plannedQuantity: 10,
			currentQuantity: 10,
			venueQuantity: 10,
			remainingQuantity: 0,
			completionPercentage: 100,
			unitPrice: null,
			totalValue: 0,
			completedValue: 0,
			pendingValue: 0,
			vendorId: null,
			vendor: null,
			notes: null,
			createdAt: new Date("2026-09-01T10:00:00.000Z"),
			updatedAt: new Date("2026-09-20T10:00:00.000Z"),
		};

		render(
			<InventoryTable
				items={[item]}
				isLoading={false}
				isError={false}
				hasActiveFilters={false}
				{...handlers}
			/>,
		);

		const addButton = screen.getByTitle(
			"Quantidade planeada concluída",
		) as HTMLButtonElement;
		expect(addButton.disabled).toBe(true);
		expect(handlers.onAddQuantity).not.toHaveBeenCalled();
	});
});
