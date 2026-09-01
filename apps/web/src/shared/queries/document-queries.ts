import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/shared/utils/orpc";

export type DocumentListParams = {
	eventId: string;
	page?: number;
	limit?: number;
	search?: string;
	type?: "CONTRACT" | "RECEIPT" | "QUOTE" | "OTHER";
	status?: "ACTIVE" | "ARCHIVED" | "DELETED";
};

export const documentKeys = {
	all: ["documents"] as const,
	list: (params: DocumentListParams) =>
		[...documentKeys.all, "list", params] as const,
};

export function useDocuments(params: DocumentListParams) {
	return useQuery({
		...orpc.documents.list.queryOptions({ input: params }),
		queryKey: documentKeys.list(params),
		enabled: !!params.eventId,
	});
}

export function useCreateDocument() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.documents.create.mutationOptions({
			onSuccess: () => {
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
