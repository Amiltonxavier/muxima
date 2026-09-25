import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import type { PaginationParams } from "./task-queries";

export interface GuestFilters {
	search?: string;
	status?:
		| "PENDING"
		| "CONFIRMED"
		| "DECLINED"
		| "WAITING"
		| "MAYBE"
		| "CANCELLED";
	type?: "FAMILY" | "FRIEND" | "COLLEAGUE" | "VIP" | "OTHER";
}

export const guestKeys = {
	all: ["guests"] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...guestKeys.all, "list", eventId, params] as const,
	detail: (id: string) => [...guestKeys.all, "detail", id] as const,
	tables: (eventId: string, params: Record<string, unknown>) =>
		[...guestKeys.all, "tables", eventId, params] as const,
};

export function useGuests(
	eventId: string,
	pagination: PaginationParams & GuestFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, status, type } = pagination;
	const input = { eventId, page, limit, search, status, type };
	return useQuery({
		...orpc.guests.list.queryOptions({ input }),
		queryKey: guestKeys.list(eventId, input),
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
					queryKey: [...guestKeys.all, "list", data.eventId],
				});
			},
		}),
	);
}

export function useUpdateGuest() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.update.mutationOptions({
			onSuccess: (_data) => {
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

export function useTables(
	eventId: string,
	pagination: PaginationParams & { search?: string } = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search } = pagination;
	const input = { eventId, page, limit, search };
	return useQuery({
		...orpc.guests.getTables.queryOptions({ input }),
		queryKey: guestKeys.tables(eventId, input),
		enabled: !!eventId,
	});
}

export function useCreateTable() {
	const queryClient = useQueryClient();
	return useMutation(
		orpc.guests.createTable.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: [...guestKeys.all, "tables", data.eventId],
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

export function useCreateInvitation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.createInvitation.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: guestKeys.all });
			},
		}),
	);
}

export function useInvitation(guestId: string) {
	return useQuery({
		...orpc.guests.getInvitation.queryOptions({ input: { guestId } }),
		queryKey: [...guestKeys.all, "invitation", guestId],
		enabled: !!guestId,
	});
}

export function useGuestStats(eventId: string) {
	return useQuery({
		...orpc.guests.getGuestStats.queryOptions({ input: { eventId } }),
		queryKey: [...guestKeys.all, "stats", eventId],
		enabled: !!eventId,
	});
}

export function useUpdateCompanion() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.updateCompanion.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: guestKeys.all });
			},
		}),
	);
}

export function useAddCompanion() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.addCompanion.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: guestKeys.all });
			},
		}),
	);
}

export function useRemoveCompanion() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.removeCompanion.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: guestKeys.all });
			},
		}),
	);
}

export function useRespondToInvitation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.respondToInvitation.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: guestKeys.all });
			},
		}),
	);
}
