import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface PaginationParams {
	page?: number;
	limit?: number;
}

export interface EventFilters {
	search?: string;
	status?: "DRAFT" | "PLANNING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
	type?: "ENGAGEMENT" | "WEDDING";
}

export const eventKeys = {
	all: ["events"] as const,
	lists: (params: Record<string, unknown>) =>
		[...eventKeys.all, "list", params] as const,
	details: () => [...eventKeys.all, "detail"] as const,
	detail: (id: string) => [...eventKeys.details(), id] as const,
};

export function useEvents(
	pagination: PaginationParams & EventFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, status, type } = pagination;
	const input = { page, limit, search, status, type };
	return useQuery({
		...orpc.events.list.queryOptions({ input }),
		queryKey: eventKeys.lists(input),
	});
}

export function useEvent(id: string) {
	return useQuery({
		...orpc.events.getById.queryOptions({ input: { id } }),
		queryKey: eventKeys.detail(id),
		enabled: !!id,
	});
}

export function useCreateEvent() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.events.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: eventKeys.lists({}) });
			},
		}),
	);
}

export function useUpdateEvent() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.events.update.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: eventKeys.lists({}) });
				queryClient.invalidateQueries({ queryKey: eventKeys.detail(data.id) });
			},
		}),
	);
}

export function useDeleteEvent() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.events.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: eventKeys.lists({}) });
			},
		}),
	);
}
