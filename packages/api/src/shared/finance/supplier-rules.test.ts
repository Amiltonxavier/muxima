import { describe, expect, it } from "vitest";
import {
	assertAgreedAmountExists,
	assertInstallmentPlanWithinAgreed,
	assertInstallmentsAllowedOnStatus,
	assertPaymentAllowedOnStatus,
	assertPaymentsWithinAgreed,
	assertStatusTransition,
} from "./supplier-rules";

describe("assertPaymentAllowedOnStatus", () => {
	it("accepts a confirmed supplier", () => {
		expect(() => assertPaymentAllowedOnStatus("CONFIRMED")).not.toThrow();
	});

	it("rejects every other status", () => {
		for (const status of [
			"PROSPECT",
			"CONTACTED",
			"NEGOTIATING",
			"COMPLETED",
			"CANCELLED",
		] as const) {
			expect(() => assertPaymentAllowedOnStatus(status)).toThrow();
		}
	});
});

describe("assertAgreedAmountExists", () => {
	it("accepts a positive agreed amount", () => {
		expect(() => assertAgreedAmountExists(100_000)).not.toThrow();
	});

	it("rejects zero, negative and missing amounts", () => {
		expect(() => assertAgreedAmountExists(0)).toThrow();
		expect(() => assertAgreedAmountExists(-1)).toThrow();
	});
});

describe("assertPaymentsWithinAgreed", () => {
	it("allows payments that reach the agreed amount exactly", () => {
		expect(() =>
			assertPaymentsWithinAgreed({
				agreedCents: 100_000_00,
				currentPaidCents: 60_000_00,
				nextAmountCents: 40_000_00,
			}),
		).not.toThrow();
	});

	it("rejects payments that exceed the agreed amount", () => {
		expect(() =>
			assertPaymentsWithinAgreed({
				agreedCents: 100_000_00,
				currentPaidCents: 70_000_00,
				nextAmountCents: 50_000_00,
			}),
		).toThrow(/excede/);
	});

	it("rejects zero and negative amounts", () => {
		expect(() =>
			assertPaymentsWithinAgreed({
				agreedCents: 100_000_00,
				currentPaidCents: 0,
				nextAmountCents: 0,
			}),
		).toThrow();
	});
});

describe("assertInstallmentsAllowedOnStatus", () => {
	it("accepts negotiating and confirmed suppliers", () => {
		expect(() =>
			assertInstallmentsAllowedOnStatus("NEGOTIATING"),
		).not.toThrow();
		expect(() => assertInstallmentsAllowedOnStatus("CONFIRMED")).not.toThrow();
	});

	it("rejects the remaining statuses", () => {
		for (const status of [
			"PROSPECT",
			"CONTACTED",
			"COMPLETED",
			"CANCELLED",
		] as const) {
			expect(() => assertInstallmentsAllowedOnStatus(status)).toThrow();
		}
	});
});

describe("assertInstallmentPlanWithinAgreed", () => {
	it("accepts a plan that reaches the agreed amount exactly", () => {
		expect(() =>
			assertInstallmentPlanWithinAgreed({
				agreedCents: 500_000_00,
				installments: [
					{ amountCents: 200_000_00 },
					{ amountCents: 150_000_00 },
					{ amountCents: 150_000_00 },
				],
			}),
		).not.toThrow();
	});

	it("rejects a plan that exceeds the agreed amount", () => {
		expect(() =>
			assertInstallmentPlanWithinAgreed({
				agreedCents: 500_000_00,
				installments: [
					{ amountCents: 200_000_00 },
					{ amountCents: 200_000_00 },
					{ amountCents: 150_000_00 },
				],
			}),
		).toThrow(/excede/);
	});

	it("rejects installments without an agreed amount", () => {
		expect(() =>
			assertInstallmentPlanWithinAgreed({
				agreedCents: 0,
				installments: [{ amountCents: 10_000 }],
			}),
		).toThrow(/montante acordado/);
	});

	it("rejects installments worth nothing", () => {
		expect(() =>
			assertInstallmentPlanWithinAgreed({
				agreedCents: 100_000_00,
				installments: [{ amountCents: 0 }],
			}),
		).toThrow(/parcela 1/i);
	});
});

describe("assertStatusTransition", () => {
	it("allows staying on the same status", () => {
		expect(() =>
			assertStatusTransition("CONFIRMED", "CONFIRMED"),
		).not.toThrow();
	});

	it("allows moving forward", () => {
		expect(() => assertStatusTransition("PROSPECT", "CONFIRMED")).not.toThrow();
		expect(() =>
			assertStatusTransition("CONFIRMED", "COMPLETED"),
		).not.toThrow();
	});

	it("blocks reopening a completed supplier", () => {
		expect(() => assertStatusTransition("COMPLETED", "NEGOTIATING")).toThrow();
		expect(() => assertStatusTransition("COMPLETED", "CONFIRMED")).toThrow();
	});
});
