import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Sidebar } from "@/shared/components/sidebar";
import { Topbar } from "@/shared/components/topbar";

export const Route = createFileRoute("/_private")({
	beforeLoad: async () => {
		const { data: session } = await authClient.getSession();
		if (!session) {
			throw redirect({ to: "/login" });
		}
	},
	component: PrivateLayout,
});

function PrivateLayout() {
	return (
		<div className="flex h-svh">
			<Sidebar />
			<div className="flex flex-1 flex-col overflow-hidden">
				<Topbar />
				<main className="flex-1 overflow-y-auto p-4 lg:p-6">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
