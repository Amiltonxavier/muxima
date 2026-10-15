import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventKeys } from "@/routes/_private/events/-queries/event-queries";
import { memberKeys } from "@/routes/_private/events/$eventId/members/-queries/member-queries";
import { accessKeys } from "@/shared/hooks/use-can";
import { orpc } from "@/utils/orpc";

export const memberInviteKeys = {
	all: ["member-invite"] as const,
	byToken: (token: string) => [...memberInviteKeys.all, token] as const,
};

/**
 * Everything a successful claim touches: the token itself, the event grid (the
 * invite disappears, the event stays), the team listing (a new ACTIVE member
 * appears the moment the invitation is claimed) and the cached event-access
 * that the `/events/$eventId` guard reads. Without the last one the guard could
 * serve a stale `{ role: null }` and bounce the new member to /403.
 */
function invalidateClaim(queryClient: ReturnType<typeof useQueryClient>) {
	queryClient.invalidateQueries({ queryKey: memberInviteKeys.all });
	queryClient.invalidateQueries({ queryKey: eventKeys.all });
	queryClient.invalidateQueries({ queryKey: memberKeys.all });
	queryClient.invalidateQueries({ queryKey: accessKeys.all });
}

/**
 * Reads the invitation behind the token so the claim page can show the event,
 * the role and who invited *before* anything is written. The backend applies
 * the same validity checks as accepting, so an invalid/expired/foreign token
 * fails here instead of on submit.
 */
export function useMemberInvite(token: string) {
	return useQuery({
		...orpc.memberInvites.get.queryOptions({ input: { token } }),
		queryKey: memberInviteKeys.byToken(token),
		enabled: !!token,
		retry: false,
	});
}

/** Consumes the token and joins the team. Single-use on the backend. */
export function useAcceptMemberInvite() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.memberInvites.accept.mutationOptions({
			onSuccess: () => invalidateClaim(queryClient),
		}),
	);
}

/** Records the refusal and consumes the token, so it cannot be reused. */
export function useDeclineMemberInvite() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.memberInvites.decline.mutationOptions({
			onSuccess: () => invalidateClaim(queryClient),
		}),
	);
}
