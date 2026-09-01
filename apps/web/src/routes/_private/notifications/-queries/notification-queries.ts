import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/shared/utils/orpc";

export type NotificationListParams = {
	page?: number;
	limit?: number;
	search?: string;
	unreadOnly?: boolean;
};

export const notificationKeys = {
	all: ["notifications"] as const,
	list: (params: NotificationListParams) =>
		[...notificationKeys.all, "list", params] as const,
	unreadCount: () => [...notificationKeys.all, "unreadCount"] as const,
};

export function useNotifications(params: NotificationListParams = {}) {
	return useQuery({
		...orpc.notifications.list.queryOptions({ input: params }),
		queryKey: notificationKeys.list(params),
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
