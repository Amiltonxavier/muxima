import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEvent } from "./-queries/event-queries";

export const Route = createFileRoute("/_private/events/$eventId")({
	component: EventLayout,
});

function EventLayout() {
	const { eventId } = Route.useParams();
	const eventQuery = useEvent(eventId);

	if (eventQuery.isLoading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="text-muted-foreground text-sm">
					A carregar evento...
				</div>
			</div>
		);
	}

	if (eventQuery.isError || !eventQuery.data) {
		return (
			<div className="flex flex-col items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">Evento não encontrado</p>
			</div>
		);
	}

	return <Outlet />;
}
