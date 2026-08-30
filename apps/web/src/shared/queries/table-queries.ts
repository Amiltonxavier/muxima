import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const tableKeys = {
	all: ["tables"] as const,
	list: (eventId: string) => [...tableKeys.all, "list", eventId] as const,
};

export function useTables(eventId: string) {
	return useQuery({
		...orpc.guests.getTables.queryOptions({ input: { eventId } }),
		queryKey: tableKeys.list(eventId),
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
