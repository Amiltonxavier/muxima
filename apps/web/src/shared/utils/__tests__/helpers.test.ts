import { describe, expect, it } from "vitest";
import { calculateBudget } from "../calculate-budget";
import {
	calculateGuestCount,
	calculateGuestPercentage,
} from "../calculate-guest-count";
import { formatCurrency, formatCurrencyCompact } from "../format-currency";
import { dateHelper } from "@/core/helpers/date-helper";
import { formatPhone, formatPhoneWithCountryCode } from "../format-phone";

describe("formatCurrency", () => {
	it("formats zero", () => {
		expect(formatCurrency(0)).toBe("0 Kz");
	});

	it("formats small amounts", () => {
		expect(formatCurrency(500)).toBe("500 Kz");
	});

	it("formats millions with separators", () => {
		const result = formatCurrency(1000000);
		expect(result).toMatch(/1[\s.]000[\s.]000 Kz/);
	});

	it("formats amounts with thousands", () => {
		const result = formatCurrency(250000);
		expect(result).toMatch(/250[\s.]000 Kz/);
	});

	it("formats large amounts", () => {
		const result = formatCurrency(15000000);
		expect(result).toMatch(/15[\s.]000[\s.]000 Kz/);
	});
});

describe("formatCurrencyCompact", () => {
	it("formats millions", () => {
		expect(formatCurrencyCompact(1000000)).toBe("1M Kz");
	});

	it("formats millions with decimal", () => {
		expect(formatCurrencyCompact(1500000)).toBe("1.5M Kz");
	});

	it("formats thousands", () => {
		expect(formatCurrencyCompact(5000)).toBe("5K Kz");
	});

	it("formats small amounts normally", () => {
		expect(formatCurrencyCompact(500)).toBe("500 Kz");
	});
});

describe("dateHelper.formatMedium", () => {
	it("formats a Date object to Portuguese format", () => {
		const date = new Date(2025, 5, 15); // June 15, 2025
		const result = dateHelper.formatMedium(date);
		expect(result).toBe("15 jun 2025");
	});

	it("formats a date string", () => {
		const result = dateHelper.formatMedium("2025-01-01");
		expect(result).toBe("01 jan 2025");
	});
});

describe("dateHelper.formatShort", () => {
	it("formats to dd/MM/yyyy", () => {
		const date = new Date(2025, 0, 5); // January 5, 2025
		const result = dateHelper.formatShort(date);
		expect(result).toBe("05/01/2025");
	});
});

describe("formatPhone", () => {
	it("formats 9-digit Angolan phone number", () => {
		expect(formatPhone("912345678")).toBe("912 345 678");
	});

	it("returns non-9-digit input as-is", () => {
		expect(formatPhone("12345")).toBe("12345");
	});

	it("strips non-digit characters and formats if 9 digits", () => {
		expect(formatPhone("912-345-678")).toBe("912 345 678");
	});
});

describe("formatPhoneWithCountryCode", () => {
	it("adds country code to phone number", () => {
		expect(formatPhoneWithCountryCode("912345678")).toBe("+244 912345678");
	});

	it("does not double-add country code", () => {
		expect(formatPhoneWithCountryCode("244912345678")).toBe("+244 912345678");
	});
});

describe("calculateBudget", () => {
	it("calculates budget with no expenses", () => {
		const result = calculateBudget(5000000, []);
		expect(result.totalPlanned).toBe(5000000);
		expect(result.totalContracted).toBe(0);
		expect(result.totalPaid).toBe(0);
		expect(result.totalPending).toBe(0);
		expect(result.utilizationPercentage).toBe(0);
		expect(result.isOverBudget).toBe(false);
	});

	it("calculates budget with mixed expenses", () => {
		const expenses = [
			{ totalAmount: 1000000, status: "PAID" },
			{ totalAmount: 500000, status: "PLANNED" },
			{ totalAmount: 300000, status: "OVERDUE" },
		];
		const result = calculateBudget(5000000, expenses);
		expect(result.totalContracted).toBe(1800000);
		expect(result.totalPaid).toBe(1000000);
		expect(result.totalPending).toBe(800000);
		expect(result.totalOverdue).toBe(300000);
		expect(result.utilizationPercentage).toBe(36);
		expect(result.isOverBudget).toBe(false);
	});

	it("detects over budget", () => {
		const expenses = [
			{ totalAmount: 3000000, status: "PAID" },
			{ totalAmount: 3000000, status: "PLANNED" },
		];
		const result = calculateBudget(5000000, expenses);
		expect(result.isOverBudget).toBe(true);
	});
});

describe("calculateGuestCount", () => {
	it("counts guests by status", () => {
		const guests = [
			{ status: "CONFIRMED", companionsLimit: 1 },
			{ status: "CONFIRMED", companionsLimit: 2 },
			{ status: "PENDING", companionsLimit: 0 },
			{ status: "DECLINED", companionsLimit: 0 },
		];
		const result = calculateGuestCount(guests);
		expect(result.total).toBe(4);
		expect(result.confirmed).toBe(2);
		expect(result.pending).toBe(1);
		expect(result.declined).toBe(1);
		expect(result.totalCompanions).toBe(3);
		expect(result.totalPeople).toBe(5);
	});

	it("handles empty guest list", () => {
		const result = calculateGuestCount([]);
		expect(result.total).toBe(0);
		expect(result.confirmed).toBe(0);
		expect(result.totalPeople).toBe(0);
	});

	it("counts WAITING status as pending", () => {
		const guests = [{ status: "WAITING", companionsLimit: 0 }];
		const result = calculateGuestCount(guests);
		expect(result.pending).toBe(1);
	});
});

describe("calculateGuestPercentage", () => {
	it("calculates percentage", () => {
		expect(calculateGuestPercentage(5, 10)).toBe(50);
	});

	it("returns 0 for empty total", () => {
		expect(calculateGuestPercentage(0, 0)).toBe(0);
	});

	it("rounds to nearest integer", () => {
		expect(calculateGuestPercentage(1, 3)).toBe(33);
	});
});
