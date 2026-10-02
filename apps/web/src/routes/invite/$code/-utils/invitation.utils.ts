import type { PublicInvitation } from "@muxima/api/shared/types/entities";
import { dateHelper } from "@/shared/utils/date-helper";
import {
	EVENT_TYPE_LABELS,
	MONTHS_PT,
} from "../-constants/invitation.constants";

export function getRecipientName(invitation: PublicInvitation): string | null {
	const first = invitation.guests[0];
	if (first?.name) return first.name;
	return null;
}

export function getRecipientInitials(
	invitation: PublicInvitation,
): string | null {
	const name = getRecipientName(invitation) ?? invitation.event.name;
	const words = name.trim().split(/\s+/).filter(Boolean);
	const initials = words
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase() ?? "")
		.filter(Boolean)
		.join(" · ");

	return initials || null;
}

export function getEventTypeLabel(type: string | undefined): string | null {
	if (!type) return null;
	return EVENT_TYPE_LABELS[type] ?? null;
}

export function getPrelude(
	type: string | undefined,
	hasGuests: boolean,
): string {
	if (type === "WEDDING" || type === "ENGAGEMENT") {
		return "Com muito amor";
	}
	return hasGuests ? "És convidado(a)" : "Convite";
}

export function getDateParts(eventDate: Date | string | null): {
	day: number;
	dayLabel: string;
	month: string;
	monthLabel: string;
	year: number;
} | null {
	const date = dateHelper.getDate(eventDate);
	if (!date) return null;

	return {
		day: date.getDate(),
		dayLabel: String(date.getDate()).padStart(2, "0"),
		month: MONTHS_PT[date.getMonth()] ?? "",
		monthLabel: (MONTHS_PT[date.getMonth()] ?? "").toUpperCase(),
		year: date.getFullYear(),
	};
}

export function getLocation(invitation: PublicInvitation): string[] {
	const { event } = invitation;
	return [event.venueName, event.address, event.neighborhood]
		.filter(Boolean)
		.map(String);
}

export function getCity(invitation: PublicInvitation): string | null {
	const { event } = invitation;
	const city = [event.municipality, event.province].filter(Boolean).join(", ");

	return city || null;
}

export function getTime(invitation: PublicInvitation): {
	start: string | null;
	end: string | null;
} {
	const { startTime, endTime } = invitation.event;
	return {
		start: startTime ? dateHelper.formatTime(`2000-01-01T${startTime}`) : null,
		end: endTime ? dateHelper.formatTime(`2000-01-01T${endTime}`) : null,
	};
}

/**
 * Effective start instant of the event (eventDate + startTime), for the
 * countdown and the calendar file. `null` when the event has no usable date.
 */
export function composeEventStartAt(invitation: PublicInvitation): Date | null {
	const { eventDate, startTime } = invitation.event;
	const date = dateHelper.getDate(eventDate);
	if (!date) return null;

	const start = new Date(date.getTime());
	const match = startTime ? /^(\d{1,2}):(\d{2})/.exec(startTime.trim()) : null;
	start.setHours(
		match ? Number(match[1]) : 0,
		match ? Number(match[2]) : 0,
		0,
		0,
	);
	return start;
}

/** Google Maps directions link from the real venue data — never invented. */
export function getMapLink(invitation: PublicInvitation): string | null {
	const { venueName, address, neighborhood, municipality, province } =
		invitation.event;
	const query = [venueName, address, neighborhood, municipality, province]
		.filter(Boolean)
		.join(", ")
		.trim();

	return query
		? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
		: null;
}

/**
 * Calendar entry (.ics) built from the real event data and downloaded by the
 * browser — no external service, no data leaves the page.
 */
export function buildEventIcs(invitation: PublicInvitation): string | null {
	const startAt = composeEventStartAt(invitation);
	if (!startAt) return null;

	const formatIcsDate = (date: Date) =>
		`${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}T${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}00Z`;

	const endTime = invitation.event.endTime;
	const end = endTime ? new Date(startAt.getTime()) : null;
	if (end && endTime) {
		const match = /^(\d{1,2}):(\d{2})/.exec(endTime.trim());
		if (match) {
			end.setHours(Number(match[1]), Number(match[2]), 0, 0);
			// endTime "02:00" after a "20:00" start rolls to the next day.
			if (end.getTime() <= startAt.getTime()) {
				end.setDate(end.getDate() + 1);
			}
		}
	}

	const lines = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Muxima//Convite//PT",
		"BEGIN:VEVENT",
		`UID:${invitation.code}@muxima`,
		`DTSTAMP:${formatIcsDate(new Date())}`,
		`DTSTART:${formatIcsDate(startAt)}`,
	];

	if (end) lines.push(`DTEND:${formatIcsDate(end)}`);
	lines.push(`SUMMARY:${invitation.event.name}`);
	const location = [invitation.event.venueName, invitation.event.address]
		.filter(Boolean)
		.join(", ");
	if (location) lines.push(`LOCATION:${location}`);
	if (invitation.event.description) {
		lines.push(`DESCRIPTION:${invitation.event.description}`);
	}
	lines.push("END:VEVENT", "END:VCALENDAR");

	return lines.join("\r\n");
}

/** Triggers a browser download of the given .ics payload. */
export function downloadIcs(invitation: PublicInvitation): void {
	const ics = buildEventIcs(invitation);
	if (!ics) return;

	const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = "convite-muxima.ics";
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export function getFormattedResponseLabel(
	response: PublicInvitation["response"],
): string | null {
	if (!response) return null;

	const labels: Record<NonNullable<PublicInvitation["response"]>, string> = {
		CONFIRM: "Confirmado",
		MAYBE: "Por confirmar",
		DECLINE: "Recusado",
	};

	return labels[response] ?? null;
}
