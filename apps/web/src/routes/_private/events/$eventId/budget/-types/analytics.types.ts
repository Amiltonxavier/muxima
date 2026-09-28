import type { BudgetSummary } from "../-queries/budget-queries";

type Breakdown = BudgetSummary["breakdown"];

/** A row of `bySource`, `byCategory` or `byPaymentStatus`, as the API sends it. */
export type BudgetEntry = Breakdown["bySource"][number];

export type PendingSupplier = Breakdown["topPendingSuppliers"][number];

export type OverdueSupplier = Breakdown["overdueSuppliers"][number];

export type MonthlySpendPoint = Breakdown["monthlySpend"][number];
