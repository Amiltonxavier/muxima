import type {
	useBudget,
	useBudgetLines,
	useBudgetSummary,
	usePaidExpenses,
} from "@/shared/queries/budget-queries";

export {
	type BudgetSource,
	useBudget,
	useBudgetLines,
	useBudgetSummary,
	usePaidExpenses,
	useUpdateBudgetTarget,
} from "@/shared/queries/budget-queries";

/** The planning target the user can write. Everything else is derived. */
export type Budget = NonNullable<ReturnType<typeof useBudget>["data"]>;

/** Totals and breakdowns, all pre-calculated by the API. */
export type BudgetSummary = NonNullable<
	ReturnType<typeof useBudgetSummary>["data"]
>;

export type BudgetTotals = BudgetSummary["totals"];

/** One drill-down row: an inventory item or a supplier. */
export type BudgetLine = NonNullable<
	ReturnType<typeof useBudgetLines>["data"]
>["data"][number];

/** One bar of the paid-expenses chart, already aggregated by the API. */
export type PaidExpense = NonNullable<
	ReturnType<typeof usePaidExpenses>["data"]
>[number];
