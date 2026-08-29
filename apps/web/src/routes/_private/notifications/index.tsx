import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/notifications/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_private/notifications/"!</div>;
}
