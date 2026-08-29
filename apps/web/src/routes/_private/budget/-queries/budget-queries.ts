import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const budgetKeys = {
	all: ["budget"] as const,
	byEvent: (eventId: string) => [...budgetKeys.all, eventId] as const,
	expenses: (eventId: string) =>
		[...budgetKeys.all, "expenses", eventId] as const,
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

export function useExpenses(eventId: string) {
	return useQuery({
		...orpc.budget.getExpenses.queryOptions({ input: { eventId } }),
		queryKey: budgetKeys.expenses(eventId),
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
					queryKey: budgetKeys.expenses(data.eventId),
				});
			},
		}),
	);
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
