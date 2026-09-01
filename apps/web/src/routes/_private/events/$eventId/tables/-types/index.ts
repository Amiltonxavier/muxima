import type { ACTION_TYPES_TABLE } from "../-constants";

export type ActionTypeTable =
	(typeof ACTION_TYPES_TABLE)[keyof typeof ACTION_TYPES_TABLE];

export interface TableItem {
	id: string;
	eventId: string;
	name: string;
	number?: number;
	capacity: number;
	location?: string;
	notes?: string;
	tableGuests?: Array<{
		id: string;
		guest?: {
			name?: string;
			status?: string;
		};
	}>;
}
