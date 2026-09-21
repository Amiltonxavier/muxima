import { Button } from "@muxima/ui/components/button";
import { Card, CardContent } from "@muxima/ui/components/card";
import { Input } from "@muxima/ui/components/input";
import { Pagination } from "@muxima/ui/components/pagination";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@muxima/ui/components/select";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Search, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
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
	const [page, setPage] = useState(1);
	const [limit, setLimit] = useState(20);
	const [search, setSearch] = useState("");
	const [filterType, setFilterType] = useState<
		"ALL" | "FINANCE" | "TASKS" | "GUESTS" | "INVENTORY" | "EVENT"
	>("ALL");
	const [filterRead, setFilterRead] = useState<string>("ALL");
	const resetPage = useCallback(() => setPage(1), []);

	const notificationsQuery = useNotifications({
		page,
		limit,
		search: search || undefined,
		type: filterType !== "ALL" ? filterType : undefined,
		read: filterRead !== "ALL" ? filterRead === "READ" : undefined,
	});
	const markAsRead = useMarkNotificationAsRead();
	const markAllAsRead = useMarkAllNotificationsAsRead();
	const deleteNotification = useDeleteNotification();

	const notifications = notificationsQuery.data?.data ?? [];
	const meta = notificationsQuery.data?.meta;

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

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="relative min-w-[200px] max-w-sm flex-1">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Pesquisar notificações..."
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							resetPage();
						}}
						className="pl-9"
					/>
				</div>
				<Select
					value={filterType}
					onValueChange={(v) => {
						if (v) setFilterType(v as typeof filterType);
						resetPage();
					}}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Tipo" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todos os tipos</SelectItem>
						<SelectItem value="FINANCE">Financeiro</SelectItem>
						<SelectItem value="TASKS">Tarefas</SelectItem>
						<SelectItem value="GUESTS">Convidados</SelectItem>
						<SelectItem value="INVENTORY">Inventário</SelectItem>
						<SelectItem value="EVENT">Evento</SelectItem>
					</SelectContent>
				</Select>
				<Select
					value={filterRead}
					onValueChange={(v) => {
						if (v) setFilterRead(v);
						resetPage();
					}}
				>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Estado" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">Todas</SelectItem>
						<SelectItem value="UNREAD">Não lidas</SelectItem>
						<SelectItem value="READ">Lidas</SelectItem>
					</SelectContent>
				</Select>
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

			{meta && (
				<Pagination
					meta={meta}
					onPageChange={setPage}
					onLimitChange={(l) => {
						setLimit(l);
						setPage(1);
					}}
					disabled={notificationsQuery.isLoading}
				/>
			)}
		</div>
	);
}
