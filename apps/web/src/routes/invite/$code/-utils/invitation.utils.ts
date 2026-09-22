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
