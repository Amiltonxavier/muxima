import { Button } from "@muxima/ui/components/button";
import { Card, CardContent } from "@muxima/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { QueryState } from "@/shared/components/states";
import { formatRelativeTime } from "@/utils/format-date";
import {
	useDeleteNotification,
	useMarkAllNotificationsAsRead,
	useMarkNotificationAsRead,
	useNotifications,
} from "./-queries/notification-queries";

export const Route = createFileRoute("/_private/notifications/")({
	component: NotificationsPage,
});

function NotificationsPage() {
	const notificationsQuery = useNotifications();
	const markAsRead = useMarkNotificationAsRead();
	const markAllAsRead = useMarkAllNotificationsAsRead();
	const deleteNotification = useDeleteNotification();

	const notifications = notificationsQuery.data ?? [];

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
					{notifications.map((n: Record<string, unknown>) => {
						const isRead = !!n.readAt;
						return (
							<Card key={n.id as string} className={isRead ? "opacity-60" : ""}>
								<CardContent className="flex items-center justify-between p-4">
									<div className="flex items-center gap-3">
										<div
											className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isRead ? "bg-muted" : "bg-primary/10"}`}
										>
											<Bell
												className={`h-4 w-4 ${isRead ? "text-muted-foreground" : "text-primary"}`}
											/>
										</div>
										<div>
											<p className="font-medium text-sm">
												{String(n.title || "")}
											</p>
											{Boolean(n.message) && (
												<p className="text-muted-foreground text-xs">
													{String(n.message || "")}
												</p>
											)}
											<p className="mt-1 text-muted-foreground text-xs">
												{formatRelativeTime(n.createdAt as string)}
											</p>
										</div>
									</div>
									<div className="flex gap-1">
										{!isRead && (
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() =>
													markAsRead.mutate({ id: n.id as string })
												}
											>
												<Check className="h-3.5 w-3.5" />
											</Button>
										)}
										<Button
											variant="ghost"
											size="icon-sm"
											className="text-destructive"
											onClick={() =>
												deleteNotification.mutate({ id: n.id as string })
											}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			</QueryState>
		</div>
	);
}
