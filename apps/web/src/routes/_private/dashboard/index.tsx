import { Button } from "@muxima/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { QueryState } from "@/shared/components/states";
import { useEvents } from "../events/-queries/event-queries";
import { CreateEventDialog } from "../events/-components/create-event-dialog";
import { EventCard } from "../events/-components/event-card";
import { getGreeting } from "./-utils";

export const Route = createFileRoute("/_private/dashboard/")({
	component: DashboardPage,
});

function DashboardPage() {
	const { data: session } = authClient.useSession();
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const eventsQuery = useEvents({});

	const events = eventsQuery.data?.data ?? [];
	const greeting = getGreeting();
	const firstName = session?.user.name?.split(" ")[0] || "Utilizador";

	return (
		<>
			<div className="space-y-6">
				<div>
					<h1 className="font-semibold text-2xl">
						{greeting}, {firstName}
					</h1>
					<p className="text-muted-foreground text-sm">
						Resumo geral da plataforma
					</p>
				</div>

				<div>
					<div className="mb-4 flex items-center justify-between">
						<h2 className="font-semibold text-lg">Os seus eventos</h2>
						<Button onClick={() => setShowCreateDialog(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Criar evento
						</Button>
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
								return (
									<EventCard event={event} />
								);
							})}
						</div>
					</QueryState>
				</div>
			</div>
			{showCreateDialog && <CreateEventDialog onOpenChange={() => setShowCreateDialog(false)} open={showCreateDialog} />}
		</>
	);
}
