import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/events/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_private/events/"!</div>;
}
