import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/shared/utils/orpc";

export type GuestListParams = {
	eventId: string;
	page?: number;
	limit?: number;
	search?: string;
	status?: "PENDING" | "CONFIRMED" | "DECLINED" | "WAITING";
	type?: "FAMILY" | "FRIEND" | "COLLEAGUE" | "VIP" | "OTHER";
};

export const guestKeys = {
	all: ["guests"] as const,
	list: (params: GuestListParams) =>
		[...guestKeys.all, "list", params.eventId, params] as const,
	detail: (id: string) => [...guestKeys.all, "detail", id] as const,
	tables: (params: { eventId: string; page?: number; limit?: number; search?: string }) =>
		[...guestKeys.all, "tables", params] as const,
};

export function useGuests(params: GuestListParams) {
	return useQuery({
		...orpc.guests.list.queryOptions({ input: params }),
		queryKey: guestKeys.list(params),
		enabled: !!params.eventId,
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
					queryKey: guestKeys.all,
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

export function useTables(params: { eventId: string; page?: number; limit?: number; search?: string }) {
	return useQuery({
		...orpc.guests.getTables.queryOptions({ input: params }),
		queryKey: guestKeys.tables(params),
		enabled: !!params.eventId,
	});
}

export function useCreateTable() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.guests.createTable.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: guestKeys.all });
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
