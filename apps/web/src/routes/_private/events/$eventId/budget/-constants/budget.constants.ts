import type { BudgetSource } from "../-queries/budget-queries";

export const SOURCE_LABELS: Record<BudgetSource, string> = {
	INVENTORY: "Inventário",
	SUPPLIER: "Fornecedores",
};

export const BUDGET_SOURCE_OPTIONS: Array<{
	value: BudgetSource;
	label: string;
}> = (Object.entries(SOURCE_LABELS) as Array<[BudgetSource, string]>).map(
	([value, label]) => ({ value, label }),
);

export const BUDGET_SOURCE_FILTER_OPTIONS = [
	{ value: "ALL" as const, label: "Todas as origens" },
	...BUDGET_SOURCE_OPTIONS,
];
