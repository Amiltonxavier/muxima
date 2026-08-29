import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/suppliers/")({
	component: RouteComponent,
});

function RouteComponent() {
	return <div>Hello "/_private/suppliers/"!</div>;
}
