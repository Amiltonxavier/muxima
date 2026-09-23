import {
	INVENTORY_CATEGORY_LABELS,
	INVENTORY_STATUS_LABELS,
	toSelectItems,
} from "@/utils/status-helpers";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;

export const INVENTORY_STATUS_FILTER_OPTIONS = [
	{ value: "ALL", label: "Todos os estados" },
	...toSelectItems(INVENTORY_STATUS_LABELS),
];

export const INVENTORY_CATEGORY_FILTER_OPTIONS = [
	{ value: "ALL", label: "Todas as categorias" },
	...toSelectItems(INVENTORY_CATEGORY_LABELS),
];

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
	PURCHASE: "Compra",
	ADD: "Entrada",
	CONSUMPTION: "Consumo",
	ADJUSTMENT: "Ajuste",
	LOSS: "Perda",
	RETURN: "Devolução",
};
