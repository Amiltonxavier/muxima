import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export const userKeys = {
	all: ["users"] as const,
	profile: () => [...userKeys.all, "profile"] as const,
	members: (eventId: string) => [...userKeys.all, "members", eventId] as const,
};

export function useProfile() {
	return useQuery({
		...orpc.users.getProfile.queryOptions({}),
		queryKey: userKeys.profile(),
	});
}

export function useUpdateProfile() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.users.updateProfile.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: userKeys.profile() });
			},
		}),
	);
}

export function useMembers(eventId: string) {
	return useQuery({
		...orpc.users.getMembers.queryOptions({ input: { eventId } }),
		queryKey: userKeys.members(eventId),
		enabled: !!eventId,
	});
}

export function useInviteMember() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.users.inviteMember.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: userKeys.members(data.eventId),
				});
			},
		}),
	);
}

export function useRemoveMember() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.users.removeMember.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: userKeys.all });
			},
		}),
	);
}

export function useUpdateMemberRole() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.users.updateMemberRole.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: userKeys.all });
			},
		}),
	);
}
