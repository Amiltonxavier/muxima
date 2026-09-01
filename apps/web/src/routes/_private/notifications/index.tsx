import { Button } from "@muxima/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCheck } from "lucide-react";
import { QueryState } from "@/shared/components/states";
import { NotificationCard } from "./-components/notification-card";
import {
	useDeleteNotification,
	useMarkAllNotificationsAsRead,
	useMarkNotificationAsRead,
	useNotifications,
} from "./-queries/notification-queries";
import type { Notification } from "./-types";

export const Route = createFileRoute("/_private/notifications/")({
	component: NotificationsPage,
});

function NotificationsPage() {
	const notificationsQuery = useNotifications();
	const markAsRead = useMarkNotificationAsRead();
	const markAllAsRead = useMarkAllNotificationsAsRead();
	const deleteNotification = useDeleteNotification();

	const notifications = (notificationsQuery.data?.data ?? []) as unknown as Notification[];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl">Notificações</h1>
					<p className="text-muted-foreground text-sm">
						{notifications.length} notificações
					</p>
				</div>
				{notifications.length > 0 && (
					<Button variant="outline" onClick={() => markAllAsRead.mutate()}>
						<CheckCheck className="mr-2 h-4 w-4" />
						Marcar todas como lidas
					</Button>
				)}
			</div>

			<QueryState
				state={{
					isLoading: notificationsQuery.isLoading,
					isError: notificationsQuery.isError,
					isEmpty: notifications.length === 0,
					hasData: notifications.length > 0,
				}}
			>
				<div className="space-y-2">
					{notifications.map((n) => (
						<NotificationCard
							key={n.id}
							notification={n}
							onMarkAsRead={(id) => markAsRead.mutate({ id })}
							onDelete={(id) => deleteNotification.mutate({ id })}
						/>
					))}
				</div>
			</QueryState>
		</div>
	);
}
