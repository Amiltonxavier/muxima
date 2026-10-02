import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const publicInvitationKeys = {
	all: ["public-invitation"] as const,
	byCode: (code: string) => [...publicInvitationKeys.all, code] as const,
	schedule: (code: string) =>
		[...publicInvitationKeys.all, "schedule", code] as const,
};

export function usePublicInvitation(code: string) {
	return useQuery({
		...orpc.invitations.public.getByCode.queryOptions({ input: { code } }),
		queryKey: publicInvitationKeys.byCode(code),
		enabled: !!code,
		retry: false,
	});
}

/** Read-only public programme, consumed only by the invite timeline. */
export function usePublicSchedule(code: string) {
	return useQuery({
		...orpc.invitations.public.schedule.queryOptions({ input: { code } }),
		queryKey: publicInvitationKeys.schedule(code),
		enabled: !!code,
		retry: false,
	});
}

export function usePublicRespond(code: string) {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.invitations.public.respond.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: publicInvitationKeys.byCode(code),
				});
			},
		}),
	);
}
