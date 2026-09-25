import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const invitationKeys = {
	all: ["invitations"] as const,
	stats: (eventId: string) =>
		[...invitationKeys.all, "stats", eventId] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...invitationKeys.all, "list", eventId, params] as const,
};

export function useInvitationStats(eventId: string) {
	return useQuery({
		...orpc.invitations.getInvitationStats.queryOptions({
			input: { eventId },
		}),
		queryKey: invitationKeys.stats(eventId),
		enabled: !!eventId,
	});
}

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

export function usePublishInvitation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.invitations.publish.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: invitationKeys.all });
			},
		}),
	);
}

export function useUnpublishInvitation() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.invitations.unpublish.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: invitationKeys.all });
			},
		}),
	);
}
