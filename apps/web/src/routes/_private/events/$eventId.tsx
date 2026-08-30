import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useEvent } from "./-queries/event-queries";

export const Route = createFileRoute("/_private/events/$eventId")({
	beforeLoad: async ({ params }) => {
		const { data: session } = await authClient.getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
		return { eventId: params.eventId };
	},
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
