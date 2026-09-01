import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/shared/utils/orpc";

export type EventListParams = {
	page?: number;
	limit?: number;
	search?: string;
	status?: "DRAFT" | "PLANNING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
	type?: "ENGAGEMENT" | "WEDDING";
};

export const eventKeys = {
	all: ["events"] as const,
	lists: () => [...eventKeys.all, "list"] as const,
	list: (params: EventListParams) => [...eventKeys.lists(), params] as const,
	details: () => [...eventKeys.all, "detail"] as const,
	detail: (id: string) => [...eventKeys.details(), id] as const,
};

export function useEvents(params: EventListParams = {}) {
	return useQuery({
		...orpc.events.list.queryOptions({ input: params }),
		queryKey: eventKeys.list(params),
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
				queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
			},
		}),
	);
}

export function useUpdateEvent() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.events.update.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
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
				queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
			},
		}),
	);
}
