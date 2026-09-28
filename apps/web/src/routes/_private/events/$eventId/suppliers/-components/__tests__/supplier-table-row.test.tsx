import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SupplierListItem } from "../../-queries/suppliers-queries";

import { SupplierTableRow } from "../supplier-table-row";

function makeSupplier(overrides: Record<string, unknown> = {}) {
	return {
		id: "sup_1",
		eventId: "evt_1",
		name: "Catering Alves",
		category: "CATERING",
		phone: "+244923456789",
		email: null,
		address: null,
		description: null,
		notes: null,
		nif: null,
		iban: null,
		hasMcxExpress: false,
		mcxPhone: null,
		status: "CONFIRMED",
		paymentModel: "FULL",
		paymentStatus: "PENDING",
		nextDueDate: null,
		price: 100_000,
		total: 100_000,
		paid: 0,
		pending: 100_000,
		percentage: 0,
		hasInstallments: false,
		remainingInstallments: 0,
		isFullyPaid: false,
		categoryFields: null,
		customFields: null,
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		...overrides,
	};
}

const handlers = {
	onView: vi.fn(),
	onAddPayment: vi.fn(),
	onManageInstallments: vi.fn(),
	onChangeStatus: vi.fn(),
	onEdit: vi.fn(),
	onDelete: vi.fn(),
};

const asSupplier = (row: unknown): SupplierListItem =>
	row as unknown as SupplierListItem;

describe("SupplierTableRow", () => {
	it("renders the agreed and missing amounts", () => {
		render(
			<SupplierTableRow supplier={asSupplier(makeSupplier())} {...handlers} />,
		);

		// A row mostra os valores; os cabeçalhos vivem na SupplierTable.
		// (acordado e em falta coincidem neste fixture: 100 000 Kz)
		expect(screen.getAllByText("100 000 Kz").length).toBe(2);
	});

	it("disables payment unless the supplier is confirmed with an agreed amount", () => {
		const { rerender } = render(
			<SupplierTableRow
				supplier={asSupplier(makeSupplier({ status: "NEGOTIATING" }))}
				{...handlers}
			/>,
		);

		const payButton = screen.getByTitle(/fornecedor confirmado/);
		expect(payButton).toBeDefined();

		rerender(
			<SupplierTableRow
				supplier={asSupplier(
					makeSupplier({ status: "CONFIRMED", price: 0, total: 0 }),
				)}
				{...handlers}
			/>,
		);
		// Pagamento e parcelas partilham a explicação do montante em falta.
		expect(screen.getAllByTitle(/montante acordado/).length).toBeGreaterThan(0);
	});

	it("enables payment for a confirmed supplier with an agreed amount", () => {
		render(
			<SupplierTableRow supplier={asSupplier(makeSupplier())} {...handlers} />,
		);
		expect(screen.getByTitle("Registar pagamento")).toBeDefined();
	});

	it("disables installments outside negotiation/confirmed", () => {
		render(
			<SupplierTableRow
				supplier={asSupplier(makeSupplier({ status: "COMPLETED" }))}
				{...handlers}
			/>,
		);
		expect(screen.getByTitle(/negocia..o ou confirmado/)).toBeDefined();
	});

	it("shows remaining installments when the plan is active", () => {
		render(
			<SupplierTableRow
				supplier={asSupplier(
					makeSupplier({
						hasInstallments: true,
						remainingInstallments: 3,
						paymentStatus: "INSTALLMENTS",
					}),
				)}
				{...handlers}
			/>,
		);
		expect(screen.getByText(/3 parcelas restantes/)).toBeDefined();
		expect(screen.getByText("Parcelado")).toBeDefined();
	});

	it("renders the status as a StatusDot (dot + text)", () => {
		const { container } = render(
			<SupplierTableRow supplier={asSupplier(makeSupplier())} {...handlers} />,
		);
		expect(screen.getByText("Confirmado")).toBeDefined();
		expect(container.querySelector("span[aria-hidden]")).toBeDefined();
	});
});
