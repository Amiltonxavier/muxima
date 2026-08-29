import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const guestKeys = {
	all: ["guests"] as const,
	list: (eventId: string) => [...guestKeys.all, "list", eventId] as const,
	detail: (id: string) => [...guestKeys.all, "detail", id] as const,
	tables: (eventId: string) => [...guestKeys.all, "tables", eventId] as const,
};

export function useGuests(eventId: string) {
	return useQuery({
		...orpc.guests.list.queryOptions({ input: { eventId } }),
		queryKey: guestKeys.list(eventId),
		enabled: !!eventId,
	});
}

export function useGuest(id: string) {
	return useQuery({
		...orpc.guests.getById.queryOptions({ input: { id } }),
		queryKey: guestKeys.detail(id),
		enabled: !!id,
	});
}

export function useCreateGuest() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.create.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: guestKeys.list(data.eventId),
				});
			},
		}),
	);
}

export function useUpdateGuest() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.update.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: guestKeys.all });
			},
		}),
	);
}

export function useDeleteGuest() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: guestKeys.all });
			},
		}),
	);
}

export function useTables(eventId: string) {
	return useQuery({
		...orpc.guests.getTables.queryOptions({ input: { eventId } }),
		queryKey: guestKeys.tables(eventId),
		enabled: !!eventId,
	});
}

export function useCreateTable() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.createTable.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: guestKeys.tables(data.eventId),
				});
			},
		}),
	);
}

export function useAssignGuestToTable() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.assignGuestToTable.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: guestKeys.all });
			},
		}),
	);
}
