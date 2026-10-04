/**
 * Date + time composition shared by the temporal rules of the event domain.
 *
 * This module is deliberately **pure** (no Prisma, no dynamic imports) so it
 * can be imported by the browser bundle through `@muxima/api` — the lock rule
 * (`shared/events/event-lock.ts`) mirrors the backend rule in the UI.
 *
 * The functions were extracted from `modules/events/lifecycle.ts`, which
 * re-exports them, so every existing consumer keeps working.
 */

/** The date + wall-clock time fields every composition rule needs. */
export type EventDateInput = {
	eventDate: Date | null;
	/** "HH:mm" local time string, e.g. "15:00". Optional. */
	startTime: string | null;
};

/** Same as `EventDateInput` plus the end time. */
export type EventEndDateInput = EventDateInput & {
	/** "HH:mm" local time string, e.g. "23:00". Optional. */
	endTime: string | null;
};

/**
 * Compose the effective start instant of an event from its date + time.
 *
 * `startTime` is a wall-clock "HH:mm" string stored alongside the date. When
 * absent, the event is considered to start at midnight of `eventDate`. This
 * helper contains all the date+time composition used by the lifecycle and by
 * the event lock so the rule lives in exactly one place.
 */
export function composeStartAt(event: EventDateInput): Date | null {
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
export function composeEndAt(event: EventEndDateInput): Date | null {
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

/** Parses a wall-clock "HH:mm" string into clamped hours/minutes. */
export function parseTimeString(time: string | null | undefined): {
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
