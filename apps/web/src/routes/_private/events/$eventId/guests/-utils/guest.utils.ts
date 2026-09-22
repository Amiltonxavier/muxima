import type { GuestStatus, GuestType } from "@muxima/api/shared/types/entities";
import { GUEST_TYPE_LABELS } from "@/utils/status-helpers";
import type { GuestItem } from "../-types/guest.types";

export function getGuestTableName(
	guest: Pick<GuestItem, "tableGuests">,
): string | null {
	const tableGuests = guest.tableGuests ?? [];
	return tableGuests.length > 0 ? (tableGuests[0]?.table?.name ?? null) : null;
}

export function getGuestCompanions(guest: {
	companions: GuestItem["companions"];
}) {
	return guest.companions ?? [];
}

export function getGuestTypeLabel(type?: GuestType | null): string {
	return GUEST_TYPE_LABELS[type || "FAMILY"] || String(type || "FAMILY");
}

export function buildGuestInitialValues(guest: GuestItem) {
	return {
		name: guest.name || "",
		phone: guest.phone || "",
		email: guest.email || "",
		group: guest.group || "",
		type: guest.type || "FAMILY",
		notes: guest.notes || "",
		status: (guest.status || "PENDING") as GuestStatus,
		tableId: guest.tableGuests?.[0]?.table?.id || "",
	};
}
