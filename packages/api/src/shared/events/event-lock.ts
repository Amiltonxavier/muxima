import { ConflictError } from "../errors/app-error";
import { EVENT_CODES } from "../errors/codes";
import { composeStartAt } from "./event-date";

/**
 * Global operational lock of an event — the single source of truth for
 * "may this event still be mutated?".
 *
 * An event is locked when:
 *   - its status is `CANCELLED` (immediate), OR
 *   - more than {@link EVENT_LOCK_WINDOW_DAYS} days (5) have passed since its
 *     `eventDate` + `startTime` (hour precision, not calendar day), OR
 *   - its status is `COMPLETED` **and** it has no usable date, so the temporal
 *     window cannot be computed (a manually concluded event with no date).
 *
 * `COMPLETED` alone does NOT lock an event inside the 5-day window: the
 * lifecycle worker concludes every event right after it ends, and those 5 days
 * are exactly the wrap-up period during which operations stay available.
 *
 * This module is deliberately **pure** (no Prisma) so the browser bundle can
 * import it from `@muxima/api/shared/events/event-lock` and mirror the rule
 * for UX. The backend re-validates every mutation server-side — the frontend
 * check is never a security mechanism.
 */

/** Days during which an event stays mutable after it happened. */
export const EVENT_LOCK_WINDOW_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Why an event is locked. Drives the PT-PT feedback shown to the user. */
export type EventLockReason = "CANCELLED" | "EXPIRED" | "COMPLETED";

/** Minimal event shape required by the lock rule. */
export type LockableEvent = {
	status: string;
	eventDate: Date | null;
	/** "HH:mm" wall-clock string stored alongside `eventDate`. */
	startTime: string | null;
};

/**
 * The lock reason for an event at instant `now`, or `null` when the event
 * still accepts operations.
 *
 * Temporal rule (hour precision, never calendar-day only):
 *
 * ```ts
 * eventDateTime.getTime() + 5 * 24 * 60 * 60 * 1000 < now.getTime()
 * ```
 *
 * Exactly 5 days after the event is still allowed; the first millisecond
 * beyond it locks the event.
 */
export function getEventLockReason(
	event: LockableEvent,
	now: Date = new Date(),
): EventLockReason | null {
	// CANCELLED locks immediately, with or without a date.
	if (event.status === "CANCELLED") return "CANCELLED";

	const startAt = composeStartAt(event);
	if (startAt !== null) {
		if (now.getTime() > startAt.getTime() + EVENT_LOCK_WINDOW_DAYS * DAY_MS) {
			return "EXPIRED";
		}
		// Inside the 5-day window (or the event is in the future) the event
		// stays mutable, whatever the lifecycle status is.
		return null;
	}

	// No usable date: the temporal window cannot be computed, so a concluded
	// event is final. Events without a date that never concluded stay open.
	return event.status === "COMPLETED" ? "COMPLETED" : null;
}

/** Whether any operation on the event's data must be rejected. */
export function isEventLocked(
	event: LockableEvent,
	now: Date = new Date(),
): boolean {
	return getEventLockReason(event, now) !== null;
}

/**
 * Single PT-PT feedback per reason — never one message per module.
 * `fallback` is used when the reason is unknown (should not happen).
 */
export function eventLockMessage(
	reason: EventLockReason | null,
	fallback = "Este evento já não permite alterações.",
): string {
	switch (reason) {
		case "CANCELLED":
			return "Este evento foi cancelado e não permite alterações.";
		case "COMPLETED":
			return "Este evento foi concluído e não permite alterações.";
		case "EXPIRED":
			return "Este evento já ultrapassou o período permitido para alterações.";
		default:
			return fallback;
	}
}

/**
 * Throws the standard API error (`409 EVENT_LOCKED`, PT-PT message) when the
 * event does not accept mutations. Never throws a plain `Error`.
 *
 * Editing the event itself (its fields and its status) is intentionally NOT
 * guarded by this rule — it is event maintenance, not event data.
 */
export function assertEventIsMutable(
	event: LockableEvent,
	now: Date = new Date(),
): void {
	const reason = getEventLockReason(event, now);
	if (reason === null) return;

	throw new ConflictError(eventLockMessage(reason), {
		code: EVENT_CODES.LOCKED,
	});
}
