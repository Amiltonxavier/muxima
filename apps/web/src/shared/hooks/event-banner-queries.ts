import type { EventStatus } from "@muxima/api/shared/types/entities";

// The banner reuses the SAME event detail query as the event pages
// (`eventKeys.detail(id)`), so navigating into an event reuses the cache
// instead of firing a second request (spec §17).
export {
	eventKeys,
	useEvent,
} from "@/routes/_private/events/-queries/event-queries";

export type EventBannerMode = "COUNTDOWN" | "ONGOING" | "COMPLETED" | "HIDDEN";

export interface EventBannerCountdown {
	startAt: Date;
	endAt: Date | null;
}

export interface EventBannerEvent {
	id: string;
	name: string;
	type: string;
	status: EventStatus;
	eventDate: string | Date | null;
	startTime: string | null;
	endTime: string | null;
	venueName?: string | null;
}

export interface EventBannerData {
	mode: EventBannerMode;
	event: EventBannerEvent | null;
	countdown: EventBannerCountdown | null;
}
