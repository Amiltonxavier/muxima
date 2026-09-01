import type { ACTION_TYPES_MEMBER } from "../-constants";

export type ActionTypeMember =
	(typeof ACTION_TYPES_MEMBER)[keyof typeof ACTION_TYPES_MEMBER];

export interface Member {
	id: string;
	userId: string;
	eventId: string;
	role: "PARTNER" | "ADMIN" | "EDITOR" | "VIEWER";
	status: "ACTIVE" | "PENDING";
	user?: {
		name?: string;
		email?: string;
	};
}
