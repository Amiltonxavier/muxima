import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/budget/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_private/budget/"!</div>;
}
