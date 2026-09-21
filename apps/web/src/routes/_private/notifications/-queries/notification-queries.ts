import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export interface PaginationParams {
	page?: number;
	limit?: number;
}

export interface NotificationFilters {
	search?: string;
	type?: "FINANCE" | "TASKS" | "GUESTS" | "INVENTORY" | "EVENT";
	read?: boolean;
}

export const notificationKeys = {
	all: ["notifications"] as const,
	list: (params: Record<string, unknown>) =>
		[...notificationKeys.all, "list", params] as const,
	unreadCount: () => [...notificationKeys.all, "unreadCount"] as const,
};

export function useNotifications(
	pagination: PaginationParams & NotificationFilters = { page: 1, limit: 20 },
) {
	const page = pagination.page ?? 1;
	const limit = pagination.limit ?? 20;
	const { search, type, read } = pagination;
	const input = { page, limit, search, type, read };
	return useQuery({
		...orpc.notifications.list.queryOptions({ input }),
		queryKey: notificationKeys.list(input),
	});
}

export function useUnreadNotificationCount() {
	return useQuery({
		...orpc.notifications.getUnreadCount.queryOptions({}),
		queryKey: notificationKeys.unreadCount(),
		refetchInterval: 30000,
	});
}

export function useMarkNotificationAsRead() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.notifications.markAsRead.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: notificationKeys.all });
			},
		}),
	);
}

export function useMarkAllNotificationsAsRead() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.notifications.markAllAsRead.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: notificationKeys.all });
			},
		}),
	);
}

export function useDeleteNotification() {
	const queryClient = useQueryClient();

	return useMutation(
		orpc.notifications.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: notificationKeys.all });
			},
		}),
	);
}
