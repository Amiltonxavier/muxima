import { describe, expect, it } from "vitest";

import {
	composeEndAt,
	composeStartAt,
	deriveLifecycleStatus,
} from "./lifecycle";

/** Helper: "2026-09-30T15:00" in *local* time, like a user would pick. */
function localDate(
	year: number,
	month: number,
	day: number,
	hours = 0,
	minutes = 0,
	seconds = 0,
	ms = 0,
): Date {
	return new Date(year, month - 1, day, hours, minutes, seconds, ms);
}

function makeEvent(
	overrides: Partial<{
		status:
			| "DRAFT"
			| "PLANNING"
			| "CONFIRMED"
			| "ONGOING"
			| "COMPLETED"
			| "CANCELLED";
		eventDate: Date | null;
		startTime: string | null;
		endTime: string | null;
	}> = {},
) {
	return {
		id: "evt_1",
		status: "CONFIRMED" as const,
		eventDate: localDate(2026, 9, 30),
		startTime: "15:00",
		endTime: "23:00",
		...overrides,
	};
}

describe("composeStartAt", () => {
	it("combines eventDate + startTime", () => {
		const start = composeStartAt(
			makeEvent({ eventDate: localDate(2026, 9, 30), startTime: "15:00" }),
		);
		expect(start).toEqual(localDate(2026, 9, 30, 15, 0));
	});

	it("defaults to midnight when startTime is missing", () => {
		const start = composeStartAt(
			makeEvent({ eventDate: localDate(2026, 9, 30), startTime: null }),
		);
		expect(start).toEqual(localDate(2026, 9, 30, 0, 0));
	});

	it("returns null when eventDate is missing", () => {
		expect(composeStartAt(makeEvent({ eventDate: null }))).toBeNull();
	});
});

describe("composeEndAt", () => {
	it("combines eventDate + endTime", () => {
		const end = composeEndAt(
			makeEvent({ eventDate: localDate(2026, 9, 30), endTime: "23:00" }),
		);
		expect(end).toEqual(localDate(2026, 9, 30, 23, 0));
	});

	it("rolls over to the next day when endTime <= startTime (party until 02:00)", () => {
		const end = composeEndAt(
			makeEvent({
				eventDate: localDate(2026, 9, 30),
				startTime: "20:00",
				endTime: "02:00",
			}),
		);
		expect(end).toEqual(localDate(2026, 10, 1, 2, 0));
	});

	it("falls back to end of day when endTime is missing", () => {
		const end = composeEndAt(
			makeEvent({ eventDate: localDate(2026, 9, 30), endTime: null }),
		);
		expect(end).toEqual(localDate(2026, 9, 30, 23, 59, 59, 999));
	});
});

describe("deriveLifecycleStatus — CONFIRMED transitions", () => {
	it("stays CONFIRMED before startAt", () => {
		const now = localDate(2026, 9, 30, 14, 59);
		expect(deriveLifecycleStatus(makeEvent(), now)).toBe("CONFIRMED");
	});

	it("becomes ONGOING exactly at startAt", () => {
		const now = localDate(2026, 9, 30, 15, 0);
		expect(deriveLifecycleStatus(makeEvent(), now)).toBe("ONGOING");
	});

	it("stays ONGOING during the event", () => {
		const now = localDate(2026, 9, 30, 18, 30);
		expect(deriveLifecycleStatus(makeEvent({ status: "CONFIRMED" }), now)).toBe(
			"ONGOING",
		);
	});

	it("becomes COMPLETED exactly at endAt", () => {
		const now = localDate(2026, 9, 30, 23, 0);
		expect(deriveLifecycleStatus(makeEvent(), now)).toBe("COMPLETED");
	});

	it("CONFIRMED with endAt long past becomes COMPLETED directly (gap between reads)", () => {
		const now = localDate(2026, 10, 2, 10, 0);
		expect(deriveLifecycleStatus(makeEvent(), now)).toBe("COMPLETED");
	});

	it("becomes COMPLETED when endTime is absent and the day is over", () => {
		const now = localDate(2026, 10, 1, 0, 30);
		expect(
			deriveLifecycleStatus(
				makeEvent({ startTime: "15:00", endTime: null }),
				now,
			),
		).toBe("COMPLETED");
	});
});

describe("deriveLifecycleStatus — ONGOING transitions", () => {
	it("stays ONGOING before endAt", () => {
		const now = localDate(2026, 9, 30, 20, 0);
		expect(deriveLifecycleStatus(makeEvent({ status: "ONGOING" }), now)).toBe(
			"ONGOING",
		);
	});

	it("becomes COMPLETED after endAt", () => {
		const now = localDate(2026, 10, 1, 8, 0);
		expect(deriveLifecycleStatus(makeEvent({ status: "ONGOING" }), now)).toBe(
			"COMPLETED",
		);
	});
});

describe("deriveLifecycleStatus — temporal-inert statuses", () => {
	it("DRAFT with startAt reached does not change", () => {
		const now = localDate(2026, 10, 1, 12, 0);
		expect(deriveLifecycleStatus(makeEvent({ status: "DRAFT" }), now)).toBe(
			"DRAFT",
		);
	});

	it("PLANNING with startAt reached does not change", () => {
		const now = localDate(2026, 10, 1, 12, 0);
		expect(deriveLifecycleStatus(makeEvent({ status: "PLANNING" }), now)).toBe(
			"PLANNING",
		);
	});

	it("CANCELLED with startAt reached does not change", () => {
		const now = localDate(2026, 10, 1, 12, 0);
		expect(deriveLifecycleStatus(makeEvent({ status: "CANCELLED" }), now)).toBe(
			"CANCELLED",
		);
	});

	it("COMPLETED never regresses", () => {
		const now = localDate(2026, 9, 29, 12, 0);
		expect(deriveLifecycleStatus(makeEvent({ status: "COMPLETED" }), now)).toBe(
			"COMPLETED",
		);
	});
});

describe("deriveLifecycleStatus — missing data", () => {
	it("keeps the persisted status when eventDate is null", () => {
		const now = localDate(2026, 10, 1, 12, 0);
		expect(deriveLifecycleStatus(makeEvent({ eventDate: null }), now)).toBe(
			"CONFIRMED",
		);
	});
});
