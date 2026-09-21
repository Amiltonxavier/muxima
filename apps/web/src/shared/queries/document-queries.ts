import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import type { PaginationParams } from "./task-queries";

export interface DocumentFilters {
	search?: string;
	type?: "CONTRACT" | "RECEIPT" | "QUOTE" | "OTHER";
	status?: "ACTIVE" | "ARCHIVED" | "DELETED";
	vendorId?: string;
}

export const documentKeys = {
	all: ["documents"] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...documentKeys.all, "list", eventId, params] as const,
};

export function useDocuments(
	eventId: string,
	pagination: PaginationParams & DocumentFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, type, status, vendorId } = pagination;
	const input = { eventId, page, limit, search, type, status, vendorId };
	return useQuery({
		...orpc.documents.list.queryOptions({ input }),
		queryKey: documentKeys.list(eventId, input),
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
