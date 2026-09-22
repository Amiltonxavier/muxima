import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { QueryState } from "@/shared/components/states";
import { orpc } from "@/utils/orpc";
import { getStatusColor, getStatusLabel } from "@/utils/status-helpers";
import { useEvents } from "../events/-queries/event-queries";
import { dateHelper } from "@/shared/utils/date-helper";

export const Route = createFileRoute("/_private/_dashboard/")({
	component: DashboardPage,
});

function DashboardPage() {
	const { data: session } = authClient.useSession();
	const eventsQuery = useEvents({ page: 1, limit: 6 });
	const statsQuery = useQuery(orpc.dashboard.getGlobalStats.queryOptions());

	const events = eventsQuery.data?.data ?? [];

	function getGreeting() {
		const hour = new Date().getHours();

		if (hour < 12) return "Bom dia";
		if (hour < 18) return "Boa tarde";

		return "Boa noite";
	}

	const greeting = getGreeting();
	const firstName = session?.user.name?.split(" ")[0] || "Utilizador";

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl">
					{greeting}, {firstName}
				</h1>
				<p className="text-muted-foreground text-sm">
					Resumo geral da plataforma
				</p>
			</div>

			{/* Events Section */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-lg">Os seus eventos</h2>
					<Button render={<Link to="/events" />}>
						<Plus className="mr-2 h-4 w-4" />
						Ver todos
					</Button>
				</div>

				<QueryState
					state={{
						isLoading: eventsQuery.isLoading,
						isError: eventsQuery.isError,
						isEmpty: false,
						hasData: events.length > 0,
					}}
				>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{events.map((event: Record<string, unknown>) => {
							return (
								<Card
									key={event.id as string}
									className="transition-shadow hover:shadow-md"
								>
									<CardHeader>
										<div className="flex items-start justify-between">
											<div className="space-y-1">
												<CardTitle>{event.name as string}</CardTitle>
												<Badge variant="outline" className="mt-1">
													{event.type === "WEDDING" ? "Casamento" : "Noivado"}
												</Badge>
											</div>
											<Badge
												className={getStatusColor(
													(event.status as string) || "DRAFT",
												)}
											>
												{getStatusLabel(
													(event.status as string) || "DRAFT",
													"event",
												)}
											</Badge>
										</div>
									</CardHeader>
									<CardContent>
										<div className="space-y-3">
											<div className="flex items-center gap-2 text-muted-foreground text-xs">
												<Calendar className="h-3 w-3" />
												<span>
													{/*event.eventDate
														? formatDate(event.eventDate as string)
														: "Sem data"*/}
												</span>
											</div>
											{Boolean(event.venueName) && (
												<div className="flex items-center gap-2 text-muted-foreground text-xs">
													<MapPin className="h-3 w-3" />
													<span>{String(event.venueName || "")}</span>
												</div>
											)}
											
												<div className="text-muted-foreground text-xs">
													{dateHelper.formatRelativeToNow(event.eventDate)}
												</div>
											
											<div className="pt-2">
												<Button
													className="w-full"
													render={
														<Link
															to="/events/$eventId"
															params={{ eventId: String(event.id) }}
														/>
													}
												>
													Gerir evento →
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</QueryState>
			</div>
		</div>
	);
}
