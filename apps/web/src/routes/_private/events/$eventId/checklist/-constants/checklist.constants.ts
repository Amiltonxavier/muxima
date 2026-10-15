import { CHECKLIST_STATUS_LABELS, toSelectItems } from "@/utils/status-helpers";
import type { LinkType } from "../-types/checklist.types";

/** Sentinel for the "no filter" option in the status select. */
export const CHECKLIST_STATUS_FILTER_ALL = "todos";

export const CHECKLIST_STATUS_FILTER_OPTIONS: ReadonlyArray<{
	value: string;
	label: string;
}> = [
	{ value: CHECKLIST_STATUS_FILTER_ALL, label: "Todos os estados" },
	...toSelectItems(CHECKLIST_STATUS_LABELS),
];

export const LINK_TYPE_OPTIONS: ReadonlyArray<{
	value: LinkType;
	label: string;
}> = [
	{ value: "NONE", label: "Sem associação" },
	{ value: "SUPPLIER", label: "Fornecedor" },
	{ value: "INVENTORY", label: "Inventário" },
];
