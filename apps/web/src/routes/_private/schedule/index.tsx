import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/schedule/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_private/schedule/"!</div>;
}
