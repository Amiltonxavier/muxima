import type { EventStatus } from "@muxima/db/prisma";

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
 * Compose the effective start instant of an event from its date + time.
 *
 * `startTime` is a wall-clock "HH:mm" string stored alongside the date. When
 * absent, the event is considered to start at midnight of `eventDate`. This
 * helper contains all the date+time composition used by the lifecycle so the
 * rule lives in exactly one place.
 */
export function composeStartAt(
	event: Pick<LifecycleEventInput, "eventDate" | "startTime">,
): Date | null {
	if (!event.eventDate || Number.isNaN(event.eventDate.getTime())) {
		return null;
	}
	const start = new Date(event.eventDate.getTime());
	const { hours, minutes } = parseTimeString(event.startTime);
	start.setHours(hours, minutes, 0, 0);
	return start;
}

/**
 * Compose the effective end instant of an event.
 *
 * `endTime` is a wall-clock "HH:mm" string. An end time earlier than the
 * start time ("02:00" after a "20:00" start — common for parties) rolls over
 * to the next day. When there is no end time the event is considered to end
 * at the end of its start day.
 */
export function composeEndAt(
	event: Pick<LifecycleEventInput, "eventDate" | "startTime" | "endTime">,
): Date | null {
	const startAt = composeStartAt(event);
	if (!startAt) return null;

	if (!event.endTime) {
		const end = new Date(startAt.getTime());
		end.setHours(23, 59, 59, 999);
		return end;
	}

	const end = new Date(startAt.getTime());
	const { hours, minutes } = parseTimeString(event.endTime);
	end.setHours(hours, minutes, 0, 0);

	if (end.getTime() <= startAt.getTime()) {
		end.setDate(end.getDate() + 1);
	}
	return end;
}

function parseTimeString(time: string | null | undefined): {
	hours: number;
	minutes: number;
} {
	if (!time) return { hours: 0, minutes: 0 };
	const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
	if (!match) return { hours: 0, minutes: 0 };
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (Number.isNaN(hours) || Number.isNaN(minutes)) {
		return { hours: 0, minutes: 0 };
	}
	return {
		hours: Math.min(Math.max(hours, 0), 23),
		minutes: Math.min(Math.max(minutes, 0), 59),
	};
}

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
