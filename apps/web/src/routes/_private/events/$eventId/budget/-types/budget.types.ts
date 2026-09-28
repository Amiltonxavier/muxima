import type { BudgetSource } from "../-queries/budget-queries";

export type BudgetSourceFilter = "ALL" | BudgetSource;

/** Shape held by the target form while the user is typing. */
export type BudgetTargetFormValues = {
	plannedAmount: number;
	reserveAmount: number;
	notes: string;
};

/** Payload sent to the API: zero and blank become `undefined`. */
export type BudgetTargetSubmitValues = {
	plannedAmount: number;
	reserveAmount?: number;
	notes?: string;
};
