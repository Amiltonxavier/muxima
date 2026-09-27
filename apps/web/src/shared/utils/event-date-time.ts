/**
 * Centralised date+time composition for events (spec §19).
 *
 * The Event model stores the calendar day (`eventDate`) plus wall-clock
 * strings (`startTime` / `endTime`, "HH:mm"). Every consumer that needs the
 * real start/end instants — countdown, banner, notifications — MUST compose
 * them through this module instead of re-implementing the combination
 * locally. Nothing here converts timezones: the wall-clock time is applied
 * directly on the stored Date, matching how the rest of the app renders
 * dates (date-fns local rendering).
 */

export interface EventScheduleInput {
	eventDate: string | Date | null | undefined;
	startTime?: string | null;
	endTime?: string | null;
}

/** Parse "HH:mm" (or "HH:mm:ss") into hours/minutes. Invalid → midnight. */
function parseTime(time: string | null | undefined): {
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

function toDate(value: string | Date | null | undefined): Date | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Effective start instant = eventDate + startTime (midnight when absent).
 * Returns null when the event has no usable date.
 */
export function composeEventStartAt(event: EventScheduleInput): Date | null {
	const date = toDate(event.eventDate);
	if (!date) return null;
	const { hours, minutes } = parseTime(event.startTime);
	const start = new Date(date.getTime());
	start.setHours(hours, minutes, 0, 0);
	return start;
}

/**
 * Effective end instant = eventDate + endTime, rolling over to the next day
 * when endTime <= startTime (e.g. "20:00" → "02:00"). Without an endTime the
 * event is considered to run until the end of its start day.
 */
export function composeEventEndAt(event: EventScheduleInput): Date | null {
	const start = composeEventStartAt(event);
	if (!start) return null;

	if (!event.endTime) {
		const end = new Date(start.getTime());
		end.setHours(23, 59, 59, 999);
		return end;
	}

	const end = new Date(start.getTime());
	const { hours, minutes } = parseTime(event.endTime);
	end.setHours(hours, minutes, 0, 0);

	if (end.getTime() <= start.getTime()) {
		end.setDate(end.getDate() + 1);
	}
	return end;
}

/** "HH:mm" rendering of a Date, used by "hoje às 15:00" copy. */
export function formatEventClock(date: Date): string {
	const hh = String(date.getHours()).padStart(2, "0");
	const mm = String(date.getMinutes()).padStart(2, "0");
	return `${hh}:${mm}`;
}
