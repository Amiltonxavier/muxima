import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { accessKeys } from "@/shared/hooks/use-can";
import { useEvent } from "./-queries/event-queries";

export const Route = createFileRoute("/_private/events/$eventId")({
	/**
	 * Gate the whole event subtree on membership.
	 *
	 * Without this the event layout renders first, its `events.getById` call
	 * comes back 403, and the user is told "Evento não encontrado" — a message
	 * that is wrong (the event exists; they simply may not see it) and that
	 * invites them to check a link instead of asking for access. Checking here
	 * also means the sidebar and every screen below render knowing the answer,
	 * so no component has to invent its own "no access" state.
	 *
	 * Note this is presentation, not protection: the API rejects the same
	 * request regardless of what the browser decides to render. A user who
	 * types the URL directly gets the same 403 from the server.
	 */
	beforeLoad: async ({ params, context, location }) => {
		const access = await context.queryClient.ensureQueryData({
			// The query options carry the fetcher; the key is the one `useEventAccess`
			// uses, so this primes the cache instead of racing a second request.
			...context.orpc.events.getMyAccess.queryOptions({
				input: { id: params.eventId },
			}),
			queryKey: accessKeys.byEvent(params.eventId),
			staleTime: 30_000,
		});

		if (access?.role) return;

		// `from` so the 403 page can offer a way back without inventing one.
		throw redirect({
			to: "/403",
			search: { from: location.href },
		});
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
