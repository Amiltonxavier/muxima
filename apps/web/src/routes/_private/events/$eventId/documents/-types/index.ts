import type { ACTION_TYPES_DOCUMENT } from "../-constants";

export type ActionTypeDocument =
	(typeof ACTION_TYPES_DOCUMENT)[keyof typeof ACTION_TYPES_DOCUMENT];

export interface Document {
	id: string;
	eventId: string;
	name: string;
	type: string;
	status?: string;
	reference?: string;
	fileUrl?: string;
}
