import { describe, expect, it } from "vitest";

import {
	composeEventEndAt,
	composeEventStartAt,
	formatEventClock,
} from "./event-date-time";

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

describe("composeEventStartAt", () => {
	it("combines date + time from strings", () => {
		expect(
			composeEventStartAt({
				eventDate: "2026-09-30T00:00:00.000Z",
				startTime: "15:00",
			}),
		).toBeInstanceOf(Date);
	});

	it("combines date + time from Date objects", () => {
		const start = composeEventStartAt({
			eventDate: localDate(2026, 9, 30),
			startTime: "15:30",
		});
		expect(start).toEqual(localDate(2026, 9, 30, 15, 30));
	});

	it("defaults to midnight without startTime", () => {
		const start = composeEventStartAt({
			eventDate: localDate(2026, 9, 30),
		});
		expect(start).toEqual(localDate(2026, 9, 30, 0, 0));
	});

	it("returns null for null/invalid dates", () => {
		expect(composeEventStartAt({ eventDate: null })).toBeNull();
		expect(composeEventStartAt({ eventDate: "not-a-date" })).toBeNull();
	});
});

describe("composeEventEndAt", () => {
	it("combines date + endTime", () => {
		const end = composeEventEndAt({
			eventDate: localDate(2026, 9, 30),
			startTime: "15:00",
			endTime: "23:00",
		});
		expect(end).toEqual(localDate(2026, 9, 30, 23, 0));
	});

	it("rolls to the next day when endTime <= startTime", () => {
		const end = composeEventEndAt({
			eventDate: localDate(2026, 9, 30),
			startTime: "20:00",
			endTime: "02:00",
		});
		expect(end).toEqual(localDate(2026, 10, 1, 2, 0));
	});

	it("ends at end-of-day without endTime", () => {
		const end = composeEventEndAt({
			eventDate: localDate(2026, 9, 30),
			startTime: "15:00",
		});
		expect(end).toEqual(localDate(2026, 9, 30, 23, 59, 59, 999));
	});

	it("returns null without a date", () => {
		expect(composeEventEndAt({ eventDate: null, endTime: "23:00" })).toBeNull();
	});
});

describe("formatEventClock", () => {
	it("pads hours and minutes", () => {
		expect(formatEventClock(localDate(2026, 9, 30, 9, 5))).toBe("09:05");
		expect(formatEventClock(localDate(2026, 9, 30, 15, 0))).toBe("15:00");
	});
});
