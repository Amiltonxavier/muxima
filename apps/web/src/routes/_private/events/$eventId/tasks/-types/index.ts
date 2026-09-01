import type { ACTION_TYPES_TASK } from "../-constants";

export type ActionTypeTask =
	(typeof ACTION_TYPES_TASK)[keyof typeof ACTION_TYPES_TASK];

export interface Task {
	id: string;
	eventId: string;
	title: string;
	description?: string;
	status: string;
	category?: string;
	priority?: string;
	dueDate?: string;
	assignee?: string;
	dependencies?: string[];
}
