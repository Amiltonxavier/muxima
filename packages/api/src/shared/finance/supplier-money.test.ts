import type { InstallmentStatus } from "@muxima/db/prisma";
import { describe, expect, it } from "vitest";

import {
	type InstallmentInput,
	inferPaymentModel,
	isFullyPaid,
	isOverdue,
	type PaymentInput,
	resolveInstallmentPlan,
	resolveSupplierMoney,
} from "./supplier-money";

const NOW = new Date("2026-06-01T00:00:00.000Z");
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000);

const installment = (
	overrides: Partial<InstallmentInput> & { amount: number; dueDate: Date },
): InstallmentInput => ({
	status: "PENDING" as InstallmentStatus,
	paidAt: null,
	...overrides,
});

const payment = (
	overrides: Partial<PaymentInput> & { amount: number },
): PaymentInput => ({
	paymentDate: day(-1),
	...overrides,
});

describe("isOverdue", () => {
	it("is true only for an unsettled due date strictly in the past", () => {
		expect(isOverdue(day(-1), false, NOW)).toBe(true);
		expect(isOverdue(day(-1), true, NOW)).toBe(false);
		expect(isOverdue(NOW, false, NOW)).toBe(false);
		expect(isOverdue(day(1), false, NOW)).toBe(false);
	});
});

describe("resolveInstallmentPlan", () => {
	it("splits the total across installments and reports progress", () => {
		const result = resolveInstallmentPlan({
			price: 300_000,
			payments: [],
			now: NOW,
			installments: [
				installment({
					amount: 100_000,
					dueDate: day(-10),
					status: "PAID",
					paidAt: day(-10),
				}),
				installment({ amount: 100_000, dueDate: day(10) }),
				installment({ amount: 100_000, dueDate: day(20) }),
			],
		});

		expect(result.total).toBe(300_000);
		expect(result.paid).toBe(100_000);
		expect(result.remaining).toBe(200_000);
		expect(result.percentage).toBe(33);
		expect(result.status).toBe("PENDING");
		expect(result.nextDueDate).toEqual(day(10));
	});

	it("is PAID when every installment is settled", () => {
		const result = resolveInstallmentPlan({
			price: 200_000,
			payments: [],
			now: NOW,
			installments: [
				installment({
					amount: 100_000,
					dueDate: day(-10),
					status: "PAID",
					paidAt: day(-10),
				}),
				installment({
					amount: 100_000,
					dueDate: day(-5),
					status: "PAID",
					paidAt: day(-5),
				}),
			],
		});

		expect(result.status).toBe("PAID");
		expect(result.remaining).toBe(0);
		expect(result.nextDueDate).toBeNull();
	});

	it("is OVERDUE when the nearest unsettled due date has passed", () => {
		const result = resolveInstallmentPlan({
			price: 200_000,
			payments: [],
			now: NOW,
			installments: [
				installment({
					amount: 100_000,
					dueDate: day(-10),
					status: "PAID",
					paidAt: day(-10),
				}),
				installment({ amount: 100_000, dueDate: day(-1) }),
			],
		});

		expect(result.status).toBe("OVERDUE");
		expect(result.nextDueDate).toEqual(day(-1));
	});

	it("never double counts a payment already covered by a settled installment", () => {
		const result = resolveInstallmentPlan({
			price: 200_000,
			payments: [payment({ amount: 100_000 })],
			now: NOW,
			installments: [
				installment({
					amount: 100_000,
					dueDate: day(-10),
					status: "PAID",
					paidAt: day(-10),
				}),
				installment({ amount: 100_000, dueDate: day(10) }),
			],
		});

		expect(result.paid).toBe(100_000);
		expect(result.remaining).toBe(100_000);
	});

	it("ignores cancelled installments in both total and progress", () => {
		const result = resolveInstallmentPlan({
			price: 200_000,
			payments: [],
			now: NOW,
			installments: [
				installment({ amount: 100_000, dueDate: day(-1) }),
				installment({ amount: 100_000, dueDate: day(-2), status: "CANCELLED" }),
			],
		});

		expect(result.total).toBe(100_000);
		expect(result.status).toBe("OVERDUE");
	});

	it("caps progress at the plan total when payments exceed it", () => {
		const result = resolveInstallmentPlan({
			price: 100_000,
			payments: [payment({ amount: 150_000 })],
			now: NOW,
			installments: [installment({ amount: 100_000, dueDate: day(10) })],
		});

		expect(result.paid).toBe(100_000);
		expect(result.remaining).toBe(0);
		expect(result.percentage).toBe(100);
		expect(result.status).toBe("PAID");
	});
});

describe("resolveSupplierMoney", () => {
	it("is PENDING with nothing recorded", () => {
		const result = resolveSupplierMoney({
			price: 500_000,
			payments: [],
			installments: [],
			now: NOW,
		});

		expect(result.paymentStatus).toBe("PENDING");
		expect(result.pending).toBe(500_000);
		expect(result.percentage).toBe(0);
		expect(result.hasInstallments).toBe(false);
	});

	it("is PAID when the payments cover the price", () => {
		const result = resolveSupplierMoney({
			price: 500_000,
			payments: [payment({ amount: 500_000 })],
			installments: [],
			now: NOW,
		});

		expect(result.paymentStatus).toBe("PAID");
		expect(result.pending).toBe(0);
		expect(result.percentage).toBe(100);
	});

	it("is INSTALLMENTS when partially paid without a schedule", () => {
		const result = resolveSupplierMoney({
			price: 500_000,
			payments: [payment({ amount: 200_000 })],
			installments: [],
			now: NOW,
		});

		expect(result.paymentStatus).toBe("INSTALLMENTS");
		expect(result.pending).toBe(300_000);
		expect(result.percentage).toBe(40);
	});

	it("is OVERDUE when a schedule has an unsettled past due date", () => {
		const result = resolveSupplierMoney({
			price: 400_000,
			payments: [payment({ amount: 100_000 })],
			now: NOW,
			installments: [
				installment({
					amount: 100_000,
					dueDate: day(-10),
					status: "PAID",
					paidAt: day(-10),
				}),
				installment({ amount: 300_000, dueDate: day(-2) }),
			],
		});

		expect(result.paymentStatus).toBe("OVERDUE");
		expect(result.nextDueDate).toEqual(day(-2));
	});

	it("prefers OVERDUE over INSTALLMENTS because the money is late", () => {
		const result = resolveSupplierMoney({
			price: 400_000,
			payments: [],
			now: NOW,
			installments: [installment({ amount: 400_000, dueDate: day(-3) })],
		});

		expect(result.paymentStatus).toBe("OVERDUE");
	});

	it("clamps pending to zero when payments exceed the price", () => {
		const result = resolveSupplierMoney({
			price: 100_000,
			payments: [payment({ amount: 120_000 })],
			installments: [],
			now: NOW,
		});

		expect(result.pending).toBe(0);
		expect(result.paid).toBe(120_000);
	});

	it("reports 0% instead of dividing by zero when no price is set", () => {
		const result = resolveSupplierMoney({
			price: 0,
			payments: [],
			installments: [],
			now: NOW,
		});

		expect(result.percentage).toBe(0);
		expect(result.pending).toBe(0);
	});
});

describe("isFullyPaid", () => {
	it("requires the payments to cover the price", () => {
		expect(
			isFullyPaid({ price: 100_000, paid: 100_000, cancelled: false }),
		).toBe(true);
		expect(
			isFullyPaid({ price: 100_000, paid: 99_999, cancelled: false }),
		).toBe(false);
	});

	it("treats any payment as settled when there is no price", () => {
		expect(isFullyPaid({ price: 0, paid: 1, cancelled: false })).toBe(true);
		expect(isFullyPaid({ price: 0, paid: 0, cancelled: false })).toBe(false);
	});

	it("is never true for a cancelled supplier", () => {
		expect(
			isFullyPaid({ price: 100_000, paid: 100_000, cancelled: true }),
		).toBe(false);
	});
});

describe("inferPaymentModel", () => {
	it("infers INSTALLMENTS from the presence of a schedule", () => {
		expect(inferPaymentModel({ hasInstallments: true })).toBe("INSTALLMENTS");
		expect(inferPaymentModel({ hasInstallments: false })).toBe("FULL");
	});

	it("never overrides an explicit choice", () => {
		expect(
			inferPaymentModel({ hasInstallments: true, requested: "CUSTOM" }),
		).toBe("CUSTOM");
	});
});
