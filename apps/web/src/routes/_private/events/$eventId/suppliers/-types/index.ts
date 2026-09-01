import type { ACTION_TYPES_VENDOR } from "../-constants";

export type ActionTypeVendor =
	(typeof ACTION_TYPES_VENDOR)[keyof typeof ACTION_TYPES_VENDOR];

export interface Vendor {
	id: string;
	eventId: string;
	name: string;
	category: string;
	status: string;
	phone?: string;
	email?: string;
	notes?: string;
	expenses?: Array<{
		id: string;
		totalAmount: number;
	}>;
}
