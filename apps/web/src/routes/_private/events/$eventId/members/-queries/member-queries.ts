import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { userKeys } from "@/routes/_private/profile/-queries/user-queries";
import { accessKeys } from "@/shared/hooks/use-can";
import { orpc } from "@/utils/orpc";
import type {
	MemberRole,
	MemberRoleFilter,
	MemberStatusFilter,
} from "../-types/member.types";

/**
 * All members-module queries/mutations.
 *
 * Every mutation invalidates the list key (never a per-item refetch), and toasts
 * are raised here so the components stay presentational.
 */
export const memberKeys = {
	all: ["members"] as const,
	list: (eventId: string, params: Record<string, unknown>) =>
		[...memberKeys.all, "list", eventId, params] as const,
};

export type MemberListParams = {
	page: number;
	limit: number;
	search?: string;
	role?: MemberRoleFilter;
	status?: MemberStatusFilter;
};

export function useMembers(eventId: string, params: MemberListParams) {
	const { page, limit, search, role, status } = params;
	// "ALL" is a UI concern — the API expects `undefined` for "no filter".
	const input = {
		eventId,
		page,
		limit,
		search: search || undefined,
		role: role && role !== "ALL" ? role : undefined,
		status: status && status !== "ALL" ? status : undefined,
	};

	return useQuery({
		...orpc.members.list.queryOptions({ input }),
		queryKey: memberKeys.list(eventId, input),
		enabled: !!eventId,
	});
}

function useInvalidateMembers() {
	const queryClient = useQueryClient();
	return () => {
		queryClient.invalidateQueries({ queryKey: memberKeys.all });
		// F-13: a role or membership change alters what the affected users are
		// ALLOWED to see. `event-access` (used by `useEventCan` and by the
		// `/events/$eventId` route guard) and the profile's roles/permissions
		// must be re-read, otherwise the UI keeps drawing (or hiding) actions
		// from the previous role until the stale time expires.
		queryClient.invalidateQueries({ queryKey: accessKeys.all });
		queryClient.invalidateQueries({ queryKey: userKeys.profile() });
	};
}

export function useAddMember() {
	const invalidate = useInvalidateMembers();

	return useMutation(
		orpc.members.add.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success("Membro adicionado com sucesso");
			},
		}),
	);
}

export function useUpdateMemberRole() {
	const invalidate = useInvalidateMembers();

	return useMutation(
		orpc.members.updateRole.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success("Papel atualizado com sucesso");
			},
		}),
	);
}

export function useRemoveMember() {
	const invalidate = useInvalidateMembers();

	return useMutation(
		orpc.members.remove.mutationOptions({
			onSuccess: () => {
				invalidate();
				toast.success("Membro removido com sucesso");
			},
		}),
	);
}

export type { MemberRole };
