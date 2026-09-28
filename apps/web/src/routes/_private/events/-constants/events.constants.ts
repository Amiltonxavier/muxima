import type { CreatableEventType } from "../-types/events.types";

export const EVENT_TYPE_OPTIONS: {
	value: CreatableEventType;
	label: string;
}[] = [
	{ value: "WEDDING", label: "Casamento" },
	{ value: "ENGAGEMENT", label: "Noivado" },
];

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
