import type { GuestStatus, GuestType } from "@muxima/api/shared/types/entities";
import type { ReactFormExtendedApi } from "@tanstack/react-form";
import type { GuestListItem } from "../-queries/guest-queries";

export type GuestItem = GuestListItem;

export type GuestStatusFilter = "ALL" | GuestStatus;
export type GuestTypeFilter = "ALL" | GuestType;

export type GuestDialogValues = {
	name: string;
	phone?: string;
	email?: string;
	group?: string;
	type?: GuestType;
	notes?: string;
	status?: GuestStatus;
	tableId?: string;
	companions?: Array<{ name: string }>;
};

export type GuestDialogInitialValues = {
	name: string;
	phone?: string;
	email?: string;
	group?: string;
	type?: GuestType;
	notes?: string;
	status?: GuestStatus;
	tableId?: string;
};

export type GuestFormState = {
	name: string;
	phone: string;
	email: string;
	group: string;
	type: GuestType;
	notes: string;
	status: "PENDING" | "DECLINED" | "CONFIRMED" | "WAITING";
	tableId: string;
};

export type GuestFormApi = ReactFormExtendedApi<
	GuestFormState,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export type ViewInvitationTable = {
	id: string;
	name: string;
	number: number | null;
	location: string | null;
};

export type ViewInvitationGuest = {
	id: string;
	guest: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		tableGuests: Array<{
			id: string;
			table: ViewInvitationTable;
		}>;
	} | null;
};

export type ViewInvitationEvent = {
	id: string;
	name: string;
	type: string;
	status: string;
	eventDate: Date | string | null;
	startTime: string | null;
	endTime: string | null;
	venueName: string | null;
	address: string | null;
	neighborhood: string | null;
	municipality: string | null;
	province: string | null;
	owner: {
		id: string;
		name: string;
		email: string;
	} | null;
};

export type ViewInvitation = {
	id: string;
	code: string;
	status: string;
	sentAt: Date | string | null;
	respondedAt: Date | string | null;
	response: string | null;
	event: ViewInvitationEvent;
	guests: ViewInvitationGuest[];
};
