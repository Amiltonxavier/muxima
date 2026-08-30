import { Badge } from "@muxima/ui/components/badge";
import { Button } from "@muxima/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@muxima/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, Gift, MapPin, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { QueryState } from "@/shared/components/states";
import { formatDate, getDaysRemaining } from "@/utils/format-date";
import { getStatusColor, getStatusLabel } from "@/utils/status-helpers";
import { useEvents } from "../events/-queries/event-queries";

export const Route = createFileRoute("/_private/dashboard/")({
	component: DashboardPage,
});

function DashboardPage() {
	const { data: session } = authClient.useSession();
	const eventsQuery = useEvents();

	const events = eventsQuery.data ?? [];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-semibold text-2xl">
					Bom dia, {session?.user.name?.split(" ")[0] || "Utilizador"}
				</h1>
				<p className="text-muted-foreground text-sm">
					Selecione um evento para começar a gerir
				</p>
			</div>

			<QueryState
				state={{
					isLoading: eventsQuery.isLoading,
					isError: eventsQuery.isError,
					isEmpty: events.length === 0,
					hasData: events.length > 0,
				}}
			>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{events.map((event: Record<string, unknown>) => {
						const daysRemaining = event.eventDate
							? getDaysRemaining(event.eventDate as string)
							: null;
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
												{event.eventDate
													? formatDate(event.eventDate as string)
													: "Sem data"}
											</span>
										</div>
										{Boolean(event.venueName) && (
											<div className="flex items-center gap-2 text-muted-foreground text-xs">
												<MapPin className="h-3 w-3" />
												<span>{String(event.venueName || "")}</span>
											</div>
										)}
										{daysRemaining !== null && (
											<div className="text-muted-foreground text-xs">
												{daysRemaining > 0
													? `${daysRemaining} dias restantes`
													: daysRemaining === 0
														? "É hoje!"
														: "Evento realizado"}
											</div>
										)}
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

			{events.length === 0 && !eventsQuery.isLoading && (
				<div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
					<Gift className="mb-4 h-12 w-12 text-muted-foreground" />
					<h3 className="font-medium text-lg">Ainda não possui eventos</h3>
					<p className="mb-4 text-muted-foreground text-sm">
						Crie o seu primeiro evento para começar a planear
					</p>
					<Button render={<Link to="/events" />}>
						<Plus className="mr-2 h-4 w-4" />
						Criar evento
					</Button>
				</div>
			)}
		</div>
	);
}
