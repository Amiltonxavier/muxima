import {
	GUEST_STATUS_LABELS,
	GUEST_TYPE_LABELS,
	toSelectItems,
} from "@/utils/status-helpers";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;

export const GUEST_STATUS_FILTER_OPTIONS = [
	{ value: "ALL", label: "Todos os estados" },
	...toSelectItems(GUEST_STATUS_LABELS),
];

export const GUEST_TYPE_FILTER_OPTIONS = [
	{ value: "ALL", label: "Todos os tipos" },
	...toSelectItems(GUEST_TYPE_LABELS),
];
