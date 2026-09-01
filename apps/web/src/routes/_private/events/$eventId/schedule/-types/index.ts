import type { ACTION_TYPES_SCHEDULE } from "../-constants";

export type ActionTypeSchedule =
	(typeof ACTION_TYPES_SCHEDULE)[keyof typeof ACTION_TYPES_SCHEDULE];

export interface Schedule {
	id: string;
	eventId: string;
	title: string;
	description?: string;
	startAt?: string;
	endAt?: string;
	location?: string;
	responsible?: string;
	status: string;
}
