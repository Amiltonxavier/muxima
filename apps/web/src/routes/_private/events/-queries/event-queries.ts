import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const eventKeys = {
	all: ["events"] as const,
	lists: () => [...eventKeys.all, "list"] as const,
	list: (eventId: string) => [...eventKeys.lists(), eventId] as const,
	details: () => [...eventKeys.all, "detail"] as const,
	detail: (id: string) => [...eventKeys.details(), id] as const,
};

export function useEvents() {
	return useQuery({
		...orpc.events.list.queryOptions({}),
		queryKey: eventKeys.lists(),
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
