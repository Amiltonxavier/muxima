import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/guests/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_private/guests/"!</div>;
}
