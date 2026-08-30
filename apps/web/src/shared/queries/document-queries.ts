import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const documentKeys = {
	all: ["documents"] as const,
	list: (eventId: string) => [...documentKeys.all, "list", eventId] as const,
};

export function useDocuments(eventId: string) {
	return useQuery({
		...orpc.documents.list.queryOptions({ input: { eventId } }),
		queryKey: documentKeys.list(eventId),
		enabled: !!eventId,
	});
}

export function useCreateDocument() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.documents.create.mutationOptions({
			onSuccess: (_data) => {
				queryClient.invalidateQueries({ queryKey: documentKeys.all });
			},
		}),
	);
}

export function useDeleteDocument() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.documents.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: documentKeys.all });
			},
		}),
	);
}
