import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { memberKeys } from "@/routes/_private/events/$eventId/members/-queries/member-queries";
import { accessKeys } from "@/shared/hooks/use-can";
import { orpc } from "@/utils/orpc";

export interface PaginationParams {
	page?: number;
	limit?: number;
}

export interface EventFilters {
	search?: string;
	status?:
		| "DRAFT"
		| "PLANNING"
		| "CONFIRMED"
		| "ONGOING"
		| "COMPLETED"
		| "CANCELLED";
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

/**
 * Claim a team invitation from the event list (`memberInvites.acceptById`).
 *
 * Accepting turns the pending invite into an ACTIVE membership with RBAC
 * permissions, so the event-access cache the route guard reads must be
 * invalidated too — otherwise `/events/$eventId` would still bounce to /403 on
 * the stale `{ role: null }`.
 */
export function useAcceptEventInvite() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.memberInvites.acceptById.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: eventKeys.all });
				queryClient.invalidateQueries({ queryKey: memberKeys.all });
				queryClient.invalidateQueries({ queryKey: accessKeys.all });
				toast.success("Convite aceite com sucesso");
			},
		}),
	);
}

/** Record a refusal from the event list; the invite can no longer be claimed. */
export function useDeclineEventInvite() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.memberInvites.declineById.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: eventKeys.all });
				toast.success("Convite recusado");
			},
		}),
	);
}
