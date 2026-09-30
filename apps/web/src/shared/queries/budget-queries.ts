import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { inventoryKeys } from "./inventory-queries";
import { supplierKeys } from "./supplier-queries";

export type BudgetSource = "INVENTORY" | "SUPPLIER";

export const budgetKeys = {
	all: ["budget"] as const,
	byEvent: (eventId: string) => [...budgetKeys.all, eventId] as const,
	summary: (eventId: string) =>
		[...budgetKeys.all, "summary", eventId] as const,
	stats: (eventId: string) => [...budgetKeys.all, "stats", eventId] as const,
	lines: (eventId: string, source?: BudgetSource) =>
		[...budgetKeys.all, "lines", eventId, source ?? "all"] as const,
	expenseAnalytics: (eventId: string) =>
		[...budgetKeys.all, "expense-analytics", eventId] as const,
};

/**
 * The budget is a read model. Every figure here — planned, spent, pending,
 * overdue, percentages — is derived by the API from the Inventory and the
 * Suppliers. The only thing the client can write is the planning target.
 */
export function useBudget(eventId: string) {
	return useQuery({
		...orpc.budget.getByEventId.queryOptions({ input: { eventId } }),
		queryKey: budgetKeys.byEvent(eventId),
		enabled: !!eventId,
	});
}

/** Totals + breakdown, the shape the analytics cards consume. */
export function useBudgetSummary(eventId: string) {
	return useQuery({
		...orpc.budget.getSummary.queryOptions({ input: { eventId } }),
		queryKey: budgetKeys.summary(eventId),
		enabled: !!eventId,
	});
}

/** Just the totals, for the compact cards. */
export function useBudgetStats(eventId: string) {
	return useQuery({
		...orpc.budget.getStats.queryOptions({ input: { eventId } }),
		queryKey: budgetKeys.stats(eventId),
		enabled: !!eventId,
	});
}

/**
 * Gastos do evento ao longo do tempo, agregados pelo backend dentro do período
 * automático do evento. Séries diária e mensal prontas a grafar.
 */
export function useExpenseAnalytics(eventId: string) {
	return useQuery({
		...orpc.budget.getExpenseAnalytics.queryOptions({ input: { eventId } }),
		queryKey: budgetKeys.expenseAnalytics(eventId),
		enabled: !!eventId,
	});
}

/** Drill-down: one line per inventory item and per supplier. */
export function useBudgetLines(eventId: string, source?: BudgetSource) {
	return useQuery({
		...orpc.budget.getLines.queryOptions({ input: { eventId, source } }),
		queryKey: budgetKeys.lines(eventId, source),
		enabled: !!eventId,
	});
}

/**
 * Updates the target. Because the totals are derived, saving a new target
 * re-computes every aggregate, so the budget keys are invalidated together
 * with inventory and suppliers — the inputs behind them.
 */
export function useUpdateBudgetTarget() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.budget.updateTarget.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: budgetKeys.all });
				queryClient.invalidateQueries({
					queryKey: inventoryKeys.all,
				});
				queryClient.invalidateQueries({
					queryKey: supplierKeys.all,
				});
			},
		}),
	);
}
