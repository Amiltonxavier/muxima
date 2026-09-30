import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { orpc } from "@/utils/orpc";
import { activityKeys } from "./activity-queries";

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

/**
 * Changes the current user's password.
 *
 * The credentials are posted straight to the API and are never kept in any
 * store, cache or query key — `mutationOptions` holds no copy of them, and the
 * inputs are only in the request body. The server revokes the other sessions
 * and records the change in the activity trail, so the History list is
 * invalidated here rather than refetched imperatively.
 */
export function useChangePassword() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.users.changePassword.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: activityKeys.all });
			},
		}),
	);
}

/**
 * Blocks the current account.
 *
 * The API revokes every session in the same transaction, so after this resolves
 * the user is signed out everywhere. We do not invalidate the profile query on
 * success — the user is leaving the app, not re-reading their own data.
 */
export function useBlockAccount() {
	return useMutation(
		orpc.users.blockAccount.mutationOptions({
			onError: (err: Error) =>
				toast.error(err.message || "Não foi possível bloquear a conta"),
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
