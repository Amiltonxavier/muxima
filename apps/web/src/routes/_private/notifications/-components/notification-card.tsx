import { Button } from "@muxima/ui/components/button";
import { Card, CardContent } from "@muxima/ui/components/card";
import { Bell, Check, Trash2 } from "lucide-react";
import { dateHelper } from "@/core/helpers/date-helper";
import type { Notification } from "../-types";

type NotificationCardProps = {
	notification: Notification;
	onMarkAsRead: (id: string) => void;
	onDelete: (id: string) => void;
};

export function NotificationCard({
	notification,
	onMarkAsRead,
	onDelete,
}: NotificationCardProps) {
	const isRead = !!notification.readAt;

	return (
		<Card className={isRead ? "opacity-60" : ""}>
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
						<p className="font-medium text-sm">{notification.title}</p>
						{notification.message && (
							<p className="text-muted-foreground text-xs">
								{notification.message}
							</p>
						)}
						<p className="mt-1 text-muted-foreground text-xs">
							{dateHelper.formatRelativeToNow(notification.createdAt)}
						</p>
					</div>
				</div>
				<div className="flex gap-1">
					{!isRead && (
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => onMarkAsRead(notification.id)}
						>
							<Check className="h-3.5 w-3.5" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-destructive"
						onClick={() => onDelete(notification.id)}
					>
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
