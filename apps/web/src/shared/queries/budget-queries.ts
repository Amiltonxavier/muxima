import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { inventoryKeys } from "./inventory-queries";
import type { PaginationParams } from "./task-queries";

export interface ExpenseFilters {
	search?: string;
	status?: "PLANNED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
	type?: "EXPENSE" | "INCOME";
	vendorId?: string;
}

export const budgetKeys = {
	all: ["budget"] as const,
	byEvent: (eventId: string) => [...budgetKeys.all, eventId] as const,
	expenses: (eventId: string, params: Record<string, unknown>) =>
		[...budgetKeys.all, "expenses", eventId, params] as const,
};

export function useBudget(eventId: string) {
	return useQuery({
		...orpc.budget.getByEventId.queryOptions({ input: { eventId } }),
		queryKey: budgetKeys.byEvent(eventId),
		enabled: !!eventId,
	});
}

export function useUpsertBudget() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.budget.upsert.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: budgetKeys.byEvent(data.eventId),
				});
			},
		}),
	);
}

export function useExpenses(
	eventId: string,
	pagination: PaginationParams & ExpenseFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, status, type, vendorId } = pagination;
	const input = { eventId, page, limit, search, status, type, vendorId };
	return useQuery({
		...orpc.budget.getExpenses.queryOptions({ input }),
		queryKey: budgetKeys.expenses(eventId, input),
		enabled: !!eventId,
	});
}

export function useCreateExpense() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.budget.createExpense.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: budgetKeys.byEvent(data.eventId),
				});
				queryClient.invalidateQueries({
					queryKey: [...budgetKeys.all, "expenses", data.eventId],
				});
				// Creating a linked expense also creates an inventory item.
				queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
			},
		}),
	);
}

export function useUpdateExpense() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.budget.updateExpense.mutationOptions({
			onSuccess: (_data) => {
				queryClient.invalidateQueries({ queryKey: budgetKeys.all });
				// The expense may have created/updated/detached an inventory item.
				queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
			},
		}),
	);
}

export function useDeleteExpense() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.budget.deleteExpense.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: budgetKeys.all });
			},
		}),
	);
}

export function useExpense(id: string) {
	return useQuery({
		...orpc.budget.getExpenseById.queryOptions({ input: { id } }),
		queryKey: [...budgetKeys.all, "expense", id],
		enabled: !!id,
	});
}

export function useCreatePayment() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.budget.createPayment.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: budgetKeys.all });
			},
		}),
	);
}

export function useBudgetStats(eventId: string) {
	return useQuery({
		...orpc.budget.getStats.queryOptions({ input: { eventId } }),
		queryKey: [...budgetKeys.all, "stats", eventId],
		enabled: !!eventId,
	});
}

export function useExpenseStats(expenseId: string) {
	return useQuery({
		...orpc.budget.getExpenseStats.queryOptions({ input: { expenseId } }),
		queryKey: [...budgetKeys.all, "expenseStats", expenseId],
		enabled: !!expenseId,
	});
}
