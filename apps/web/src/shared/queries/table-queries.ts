import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import type { PaginationParams } from "./task-queries";

export interface TableFilters {
	search?: string;
}

export const tableKeys = {
	all: ["tables"] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...tableKeys.all, "list", eventId, params] as const,
};

export function useTables(
	eventId: string,
	pagination: PaginationParams & TableFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search } = pagination;
	const input = { eventId, page, limit, search };
	return useQuery({
		...orpc.guests.getTables.queryOptions({ input }),
		queryKey: tableKeys.list(eventId, input),
		enabled: !!eventId,
	});
}

export function useCreateTable() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.guests.createTable.mutationOptions({
			onSuccess: (_data) => {
				queryClient.invalidateQueries({ queryKey: tableKeys.all });
			},
		}),
	);
}

export function useUpdateTable() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.guests.updateTable.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: tableKeys.all });
			},
		}),
	);
}

export function useDeleteTable() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.guests.deleteTable.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: tableKeys.all });
			},
		}),
	);
}
