import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InstallmentTimeline } from "../supplier-details-dialog";

const NOW = new Date("2026-10-01T12:00:00");

describe("InstallmentTimeline", () => {
	it("renders every installment with position, amount and due date", () => {
		render(
			<InstallmentTimeline
				now={NOW}
				installments={[
					{
						id: "i1",
						position: 1,
						amount: 200_000,
						dueDate: "2026-10-10",
						status: "PAID",
						paidAt: "2026-10-05",
					},
					{
						id: "i2",
						position: 2,
						amount: 150_000,
						dueDate: "2026-11-10",
						status: "PENDING",
						paidAt: null,
					},
				]}
			/>,
		);

		expect(screen.getByText("Parcela 1")).toBeDefined();
		expect(screen.getByText("Parcela 2")).toBeDefined();
		expect(screen.getByText(/Paga em/)).toBeDefined();
		expect(screen.getByText("Por pagar")).toBeDefined();
	});

	it("marks a past unpaid installment as overdue", () => {
		render(
			<InstallmentTimeline
				now={NOW}
				installments={[
					{
						id: "i1",
						position: 1,
						amount: 100_000,
						dueDate: "2026-09-01",
						status: "PENDING",
						paidAt: null,
					},
				]}
			/>,
		);

		expect(screen.getByText("Em atraso")).toBeDefined();
	});
});
