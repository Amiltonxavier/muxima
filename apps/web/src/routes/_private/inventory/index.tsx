import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/inventory/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_private/inventory/"!</div>;
}
