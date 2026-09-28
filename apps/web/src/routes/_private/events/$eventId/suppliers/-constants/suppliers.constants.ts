import {
	SUPPLIER_CATEGORY_LABELS,
	SUPPLIER_STATUS_LABELS,
	toSelectItems,
} from "@/utils/status-helpers";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;

/** Cancelled payments are never shown as a filter, they are not actionable. */
export const SUPPLIER_PAYMENT_FILTER_LABELS: Record<string, string> = {
	PENDING: "Por pagar",
	INSTALLMENTS: "Em parcelas",
	OVERDUE: "Em atraso",
	PAID: "Pago",
};

export const SUPPLIER_CATEGORY_FILTER_OPTIONS = [
	{ value: "ALL", label: "Todas as categorias" },
	...toSelectItems(SUPPLIER_CATEGORY_LABELS),
];

export const SUPPLIER_STATUS_OPTIONS = toSelectItems(SUPPLIER_STATUS_LABELS);

export const SUPPLIER_CATEGORY_OPTIONS = toSelectItems(
	SUPPLIER_CATEGORY_LABELS,
);

export const SUPPLIER_PAYMENT_STATUS_FILTER_OPTIONS = [
	{ value: "ALL", label: "Todos os pagamentos" },
	...toSelectItems(SUPPLIER_PAYMENT_FILTER_LABELS),
];
