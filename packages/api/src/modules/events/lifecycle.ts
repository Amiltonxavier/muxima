import type { EventStatus } from "@muxima/db/prisma";
import { composeEndAt, composeStartAt } from "../../shared/events/event-date";

// The date+time composition is a pure rule shared with the event lock
// (`shared/events/event-lock.ts`), so it lives in `shared/events/event-date`
// and is re-exported here to keep every existing consumer working.
export { composeEndAt, composeStartAt };

/**
 * Temporal lifecycle of an event.
 *
 * The only automatic transitions are:
 *
 *   CONFIRMED ──(startAt reached)──▶ ONGOING ──(endAt reached)──▶ COMPLETED
 *
 * Every other status (DRAFT, PLANNING, CANCELLED) is temporal-inert: the
 * calendar moving forward must never change it, and the countdown must never
 * be displayed for it.
 *
 * The lifecycle is applied lazily (on read) and persisted, so the stored
 * status converges to the correct phase without a per-second worker. The
 * frontend renders the countdown from `status` + dates; it never mutates the
 * status itself.
 */

/** A minimal event shape required by the lifecycle functions. */
export type LifecycleEventInput = {
	status: EventStatus;
	eventDate: Date | null;
	/** "HH:mm" local time string, e.g. "15:00". Optional. */
	startTime: string | null;
	/** "HH:mm" local time string, e.g. "23:00". Optional. */
	endTime: string | null;
};

/** Raw transition result: the status the event should be in at `now`. */
export type DerivedLifecycleStatus = EventStatus;

/**
 * Pure function: derive the status an event should have at instant `now`.
 *
 * Rules (in order):
 * 1. Without a usable date the event keeps its persisted status.
 * 2. DRAFT / PLANNING / CANCELLED never participate in the lifecycle.
 * 3. ONGOING that has passed its end becomes COMPLETED.
 * 4. CONFIRMED whose start has arrived becomes ONGOING, or COMPLETED when the
 *    end has already passed too (handles long gaps between reads).
 */
export function deriveLifecycleStatus(
	event: LifecycleEventInput,
	now: Date = new Date(),
): DerivedLifecycleStatus {
	const startAt = composeStartAt(event);
	if (!startAt) return event.status;

	const endAt = composeEndAt(event);

	// Temporal-inert statuses: only CONFIRMED and ONGOING react to the clock.
	if (event.status !== "CONFIRMED" && event.status !== "ONGOING") {
		return event.status;
	}

	const nowMs = now.getTime();

	if (event.status === "CONFIRMED") {
		if (endAt && nowMs >= endAt.getTime()) return "COMPLETED";
		if (nowMs >= startAt.getTime()) return "ONGOING";
		return "CONFIRMED";
	}

	// event.status === "ONGOING"
	if (endAt && nowMs >= endAt.getTime()) return "COMPLETED";
	return "ONGOING";
}

/**
 * Lazily synchronise one event: derive the temporal status and persist it
 * when it differs from the stored value. Returns the (possibly updated)
 * status so callers can use it in the same request without a second read.
 */
export async function syncEventLifecycle(
	event: LifecycleEventInput & { id: string },
	now: Date = new Date(),
): Promise<EventStatus> {
	const { deriveStatusForEvent } = await import("./lifecycle-store");

	const derived = deriveLifecycleStatus(event, now);
	if (derived === event.status) return event.status;

	await deriveStatusForEvent(event.id, derived);
	return derived;
}
