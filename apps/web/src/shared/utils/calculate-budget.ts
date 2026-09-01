export interface BudgetCalculation {
	totalPlanned: number;
	totalContracted: number;
	totalPaid: number;
	totalPending: number;
	totalOverdue: number;
	utilizationPercentage: number;
	isOverBudget: boolean;
}

export function calculateBudget(
	plannedAmount: number,
	expenses: Array<{ totalAmount: number; status: string }>,
): BudgetCalculation {
	const totalContracted = expenses.reduce((sum, e) => sum + e.totalAmount, 0);

	const paidExpenses = expenses.filter(
		(e) => e.status === "PAID" || e.status === "PARTIALLY_PAID",
	);
	const totalPaid = paidExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

	const pendingExpenses = expenses.filter(
		(e) =>
			e.status === "PLANNED" ||
			e.status === "PARTIALLY_PAID" ||
			e.status === "OVERDUE",
	);
	const totalPending = pendingExpenses.reduce(
		(sum, e) => sum + e.totalAmount,
		0,
	);

	const overdueExpenses = expenses.filter((e) => e.status === "OVERDUE");
	const totalOverdue = overdueExpenses.reduce(
		(sum, e) => sum + e.totalAmount,
		0,
	);

	const utilizationPercentage =
		plannedAmount > 0 ? Math.round((totalContracted / plannedAmount) * 100) : 0;

	return {
		totalPlanned: plannedAmount,
		totalContracted,
		totalPaid,
		totalPending,
		totalOverdue,
		utilizationPercentage,
		isOverBudget: totalContracted > plannedAmount,
	};
}

export function calculateExpenseStatus(
	totalAmount: number,
	paidAmount: number,
	dueDate?: Date | string,
): string {
	if (paidAmount >= totalAmount) return "PAID";
	if (paidAmount > 0) {
		if (dueDate && new Date(dueDate) < new Date()) return "OVERDUE";
		return "PARTIALLY_PAID";
	}
	if (dueDate && new Date(dueDate) < new Date()) return "OVERDUE";
	return "PLANNED";
}

export function calculatePendingAmount(
	totalAmount: number,
	paidAmount: number,
): number {
	return Math.max(0, totalAmount - paidAmount);
}
