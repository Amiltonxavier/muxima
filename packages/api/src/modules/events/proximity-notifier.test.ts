import { describe, expect, it } from "vitest";

import { buildMilestoneNotification } from "./proximity-notifier";

function localDate(
	year: number,
	month: number,
	day: number,
	hours = 0,
	minutes = 0,
): Date {
	return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function makeEvent(
	overrides: Partial<{
		id: string;
		status: string;
		eventDate: Date | null;
		startTime: string | null;
		endTime: string | null;
	}> = {},
) {
	return {
		id: "evt_1",
		status: "CONFIRMED",
		eventDate: localDate(2026, 12, 26),
		startTime: "15:00",
		endTime: "23:00",
		...overrides,
	};
}

describe("buildMilestoneNotification", () => {
	it("returns the 30-day milestone when exactly 30 days remain", () => {
		const now = localDate(2026, 11, 26, 15, 0);
		const result = buildMilestoneNotification(makeEvent(), { now });
		expect(result?.milestone).toBe("d30");
		expect(result?.message).toContain("30 dias");
	});

	it("returns the 7-day milestone within the week", () => {
		const now = localDate(2026, 12, 19, 15, 0);
		const result = buildMilestoneNotification(makeEvent(), { now });
		expect(result?.milestone).toBe("d7");
	});

	it("returns the 1-day (tomorrow) milestone the day before", () => {
		const now = localDate(2026, 12, 25, 20, 0);
		const result = buildMilestoneNotification(makeEvent(), { now });
		expect(result?.milestone).toBe("d1");
		expect(result?.message).toContain("amanhã");
	});

	it("prefers the today milestone over the d1 milestone on the event day", () => {
		// daysRemaining floors to 0 on the event day; "today" must win.
		const now = localDate(2026, 12, 26, 9, 0);
		const result = buildMilestoneNotification(makeEvent(), { now });
		expect(result?.milestone).toBe("today");
	});

	it("returns the today milestone on the event day with the start time", () => {
		const now = localDate(2026, 12, 26, 10, 0);
		const result = buildMilestoneNotification(makeEvent(), { now });
		expect(result?.milestone).toBe("today");
		expect(result?.message).toContain("hoje às 15:00");
	});

	it("returns the ongoing milestone after startAt", () => {
		const now = localDate(2026, 12, 26, 16, 0);
		const result = buildMilestoneNotification(
			makeEvent({ status: "ONGOING" }),
			{ now },
		);
		expect(result?.milestone).toBe("ongoing");
	});

	it("returns the completed milestone after endAt", () => {
		const now = localDate(2026, 12, 27, 10, 0);
		const result = buildMilestoneNotification(makeEvent(), { now });
		expect(result?.milestone).toBe("completed");
	});

	it("returns null for DRAFT events even when the date is close", () => {
		const now = localDate(2026, 12, 25, 12, 0);
		const result = buildMilestoneNotification(makeEvent({ status: "DRAFT" }), {
			now,
		});
		expect(result).toBeNull();
	});

	it("returns null for CANCELLED events", () => {
		const now = localDate(2026, 12, 25, 12, 0);
		const result = buildMilestoneNotification(
			makeEvent({ status: "CANCELLED" }),
			{ now },
		);
		expect(result).toBeNull();
	});

	it("returns null without a date", () => {
		const result = buildMilestoneNotification(makeEvent({ eventDate: null }), {
			now: localDate(2026, 12, 25, 12, 0),
		});
		expect(result).toBeNull();
	});

	it("produces a deterministic payload for the same milestone (idempotency base)", () => {
		const a = buildMilestoneNotification(makeEvent(), {
			now: localDate(2026, 12, 26, 10, 0),
		});
		const b = buildMilestoneNotification(makeEvent(), {
			now: localDate(2026, 12, 26, 12, 0),
		});
		expect(a).toEqual(b);
	});
});
