export type EventStatus = "DRAFT" | "PLANNING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type EventType = "WEDDING" | "ENGAGEMENT";

export interface EventItem {
	id: string;
	name: string;
	type?: EventType;
	status?: EventStatus;
	eventDate?: string;
	startTime?: string;
	endTime?: string;
	venueName?: string;
	address?: string;
	capacity?: number;
	description?: string;
}
