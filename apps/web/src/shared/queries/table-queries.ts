import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/shared/utils/orpc";

export type TableListParams = {
	eventId: string;
	page?: number;
	limit?: number;
	search?: string;
};

export const tableKeys = {
	all: ["tables"] as const,
	list: (params: TableListParams) =>
		[...tableKeys.all, "list", params] as const,
};

export function useTables(params: TableListParams) {
	return useQuery({
		...orpc.guests.getTables.queryOptions({ input: params }),
		queryKey: tableKeys.list(params),
		enabled: !!params.eventId,
	});
}

export function useCreateTable() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.guests.createTable.mutationOptions({
			onSuccess: () => {
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
