import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { guestKeys } from "@/shared/queries/guest-queries";
import { orpc } from "@/utils/orpc";

/**
 * Every invitation query/mutation used by the guests module.
 *
 * Migrated from the (now deactivated) `invitations` page module and extended
 * with the bulk publish operation. Bulk publish is a single backend call —
 * there is no per-invitation request loop anywhere in the UI.
 */
export const invitationKeys = {
	all: ["invitations"] as const,
	stats: (eventId: string) =>
		[...invitationKeys.all, "stats", eventId] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...invitationKeys.all, "list", eventId, params] as const,
	byGuest: (eventId: string, guestId: string) =>
		[...invitationKeys.all, "guest", eventId, guestId] as const,
};

export type InvitationListParams = {
	page: number;
	limit: number;
	search?: string;
	response?:
		| "ALL"
		| "CONFIRM"
		| "DECLINE"
		| "MAYBE"
		| "PENDING"
		| "EXPIRED"
		| "CANCELLED";
};

export function useInvitations(
	eventId: string,
	params: InvitationListParams = { page: 1, limit: 20 },
) {
	const { page, limit, search, response = "ALL" } = params;
	const input = { eventId, page, limit, search, response };
	return useQuery({
		...orpc.invitations.list.queryOptions({ input }),
		queryKey: invitationKeys.list(eventId, input),
		enabled: !!eventId,
	});
}

export function useInvitationStats(eventId: string) {
	return useQuery({
		...orpc.invitations.getStats.queryOptions({ input: { eventId } }),
		queryKey: invitationKeys.stats(eventId),
		enabled: !!eventId,
	});
}

/** Invitation attached to a guest, with event + table context. */
export function useInvitation(eventId: string, guestId: string) {
	return useQuery({
		...orpc.invitations.byGuest.queryOptions({ input: { eventId, guestId } }),
		queryKey: invitationKeys.byGuest(eventId, guestId),
		enabled: !!eventId && !!guestId,
		retry: false,
	});
}

function useInvalidateInvitations() {
	const queryClient = useQueryClient();

	return () => {
		queryClient.invalidateQueries({ queryKey: invitationKeys.all });
		// Publishing changes guest-facing data too (share dialog, table states).
		queryClient.invalidateQueries({ queryKey: guestKeys.all });
	};
}

export function useCreateInvitation() {
	const invalidate = useInvalidateInvitations();

	return useMutation(
		orpc.invitations.create.mutationOptions({
			onSuccess: () => invalidate(),
		}),
	);
}

export function usePublishInvitation() {
	const invalidate = useInvalidateInvitations();

	return useMutation(
		orpc.invitations.publish.mutationOptions({
			onSuccess: () => invalidate(),
		}),
	);
}

export function useUnpublishInvitation() {
	const invalidate = useInvalidateInvitations();

	return useMutation(
		orpc.invitations.unpublish.mutationOptions({
			onSuccess: () => invalidate(),
		}),
	);
}

/**
 * Publishes every selected invitation in ONE backend operation. The mutation
 * returns a per-invitation outcome so the UI can report partial failures.
 */
export function usePublishInvitationsBatch() {
	const invalidate = useInvalidateInvitations();

	return useMutation(
		orpc.invitations.publishBatch.mutationOptions({
			onSuccess: () => invalidate(),
		}),
	);
}

export function useRespondToInvitation() {
	const invalidate = useInvalidateInvitations();

	return useMutation(
		orpc.invitations.respond.mutationOptions({
			onSuccess: () => invalidate(),
		}),
	);
}
