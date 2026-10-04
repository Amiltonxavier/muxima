import { describe, expect, it } from "vitest";
import { ConflictError } from "../errors/app-error";
import { EVENT_CODES } from "../errors/codes";
import {
	assertEventIsMutable,
	EVENT_LOCK_WINDOW_DAYS,
	eventLockMessage,
	getEventLockReason,
	isEventLocked,
	type LockableEvent,
} from "./event-lock";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Local 2026-10-10 18:00 — the event instant used across the scenarios. */
const EVENT_START = new Date(2026, 9, 10, 18, 0, 0, 0);

function makeEvent(overrides: Partial<LockableEvent> = {}): LockableEvent {
	return {
		status: "CONFIRMED",
		eventDate: new Date(EVENT_START.getTime()),
		startTime: "18:00",
		...overrides,
	};
}

describe("getEventLockReason — status rules", () => {
	it("locks a CANCELLED event immediately", () => {
		const event = makeEvent({ status: "CANCELLED" });
		expect(getEventLockReason(event, new Date(2026, 9, 10, 20, 0))).toBe(
			"CANCELLED",
		);
	});

	it("locks a CANCELLED event even without a date", () => {
		expect(
			getEventLockReason(makeEvent({ status: "CANCELLED", eventDate: null })),
		).toBe("CANCELLED");
	});

	it("locks a COMPLETED event that has no usable date", () => {
		expect(
			getEventLockReason(makeEvent({ status: "COMPLETED", eventDate: null })),
		).toBe("COMPLETED");
	});

	it("keeps a COMPLETED event mutable inside the 5-day window", () => {
		// The lifecycle worker concludes every event right after it ends, so
		// COMPLETED inside the window is exactly the wrap-up period.
		const event = makeEvent({ status: "COMPLETED" });
		expect(
			getEventLockReason(event, new Date(EVENT_START.getTime() + 2 * DAY_MS)),
		).toBeNull();
	});

	it.each(["DRAFT", "PLANNING", "CONFIRMED", "ONGOING"] as const)(
		"never locks %s on status alone",
		(status) => {
			const future = new Date(2026, 11, 20, 15, 0);
			const event = makeEvent({
				status,
				eventDate: new Date(future.getTime()),
				startTime: "15:00",
			});
			expect(getEventLockReason(event, future)).toBeNull();
		},
	);
});

describe("getEventLockReason — temporal rule (eventDateTime + 5 days)", () => {
	it("allows an event that just happened", () => {
		const now = new Date(EVENT_START.getTime() + 2 * HOUR_MS);
		expect(getEventLockReason(makeEvent(), now)).toBeNull();
	});

	it("allows an event that happened 1 day ago", () => {
		expect(
			getEventLockReason(makeEvent(), new Date(EVENT_START.getTime() + DAY_MS)),
		).toBeNull();
	});

	it("allows an event that happened 3 days ago", () => {
		expect(
			getEventLockReason(
				makeEvent(),
				new Date(EVENT_START.getTime() + 3 * DAY_MS),
			),
		).toBeNull();
	});

	it("allows an event that happened 4 days ago", () => {
		expect(
			getEventLockReason(
				makeEvent(),
				new Date(EVENT_START.getTime() + 4 * DAY_MS),
			),
		).toBeNull();
	});

	it("allows an event at exactly 5 days (limit is exclusive)", () => {
		const now = new Date(
			EVENT_START.getTime() + EVENT_LOCK_WINDOW_DAYS * DAY_MS,
		);
		expect(getEventLockReason(makeEvent(), now)).toBeNull();
	});

	it("locks one minute after the 5-day limit", () => {
		const now = new Date(
			EVENT_START.getTime() + EVENT_LOCK_WINDOW_DAYS * DAY_MS + MINUTE_MS,
		);
		expect(getEventLockReason(makeEvent(), now)).toBe("EXPIRED");
	});

	it("locks an event that happened 6 days ago", () => {
		expect(
			getEventLockReason(
				makeEvent(),
				new Date(EVENT_START.getTime() + 6 * DAY_MS),
			),
		).toBe("EXPIRED");
	});

	it("compares date AND time, not the calendar day", () => {
		// 15/10 às 18:00 = exactly 5 days → still allowed.
		const atLimit = new Date(2026, 9, 15, 18, 0, 0, 0);
		expect(getEventLockReason(makeEvent(), atLimit)).toBeNull();

		// 15/10 às 18:01 → past the limit → locked, even though it is the same
		// calendar day as the exact 5-day boundary.
		expect(
			getEventLockReason(makeEvent(), new Date(2026, 9, 15, 18, 1, 0, 0)),
		).toBe("EXPIRED");

		// A morning on the 5th day is still inside the window.
		expect(
			getEventLockReason(makeEvent(), new Date(2026, 9, 15, 9, 0, 0, 0)),
		).toBeNull();
	});

	it("does not lock an event with a future date", () => {
		expect(
			getEventLockReason(makeEvent(), new Date(2026, 9, 1, 12, 0)),
		).toBeNull();
	});

	it("does not lock a past event without a usable date", () => {
		expect(
			getEventLockReason(
				makeEvent({ status: "CONFIRMED", eventDate: null }),
				new Date(2030, 0, 1),
			),
		).toBeNull();
	});
});

describe("isEventLocked", () => {
	it("mirrors getEventLockReason", () => {
		const expired = new Date(EVENT_START.getTime() + 6 * DAY_MS);
		expect(isEventLocked(makeEvent(), expired)).toBe(true);
		expect(
			isEventLocked(makeEvent(), new Date(EVENT_START.getTime() + DAY_MS)),
		).toBe(false);
	});
});

describe("assertEventIsMutable", () => {
	it("does nothing for a mutable event", () => {
		expect(() =>
			assertEventIsMutable(makeEvent(), new Date(EVENT_START.getTime())),
		).not.toThrow();
	});

	it("throws the standard 409 EVENT_LOCKED error for a CANCELLED event", () => {
		const thrown = captureError(() =>
			assertEventIsMutable(makeEvent({ status: "CANCELLED" })),
		);
		expect(thrown).toBeInstanceOf(ConflictError);
		expect(thrown?.statusCode).toBe(409);
		expect(thrown?.code).toBe(EVENT_CODES.LOCKED);
		expect(thrown?.code).toBe("EVENT_LOCKED");
		expect(thrown?.message).toBe(
			"Este evento foi cancelado e não permite alterações.",
		);
	});

	it("uses a PT-PT message per reason", () => {
		const expired = captureError(() =>
			assertEventIsMutable(
				makeEvent(),
				new Date(EVENT_START.getTime() + 6 * DAY_MS),
			),
		);
		expect(expired?.message).toBe(
			"Este evento já ultrapassou o período permitido para alterações.",
		);

		const completed = captureError(() =>
			assertEventIsMutable(makeEvent({ status: "COMPLETED", eventDate: null })),
		);
		expect(completed?.message).toBe(
			"Este evento foi concluído e não permite alterações.",
		);
	});

	it("never throws a plain Error", () => {
		try {
			assertEventIsMutable(makeEvent({ status: "CANCELLED" }));
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(ConflictError);
			// A plain `new Error(...)` would bypass the normalised envelope.
			expect(error?.constructor).not.toBe(Error);
		}
	});
});

describe("eventLockMessage", () => {
	it("falls back to the generic PT-PT message", () => {
		expect(eventLockMessage(null)).toBe(
			"Este evento já não permite alterações.",
		);
	});
});

function captureError(run: () => void): ConflictError | null {
	try {
		run();
		return null;
	} catch (error) {
		return error instanceof ConflictError ? error : null;
	}
}
