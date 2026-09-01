import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Sidebar } from "@/shared/components/sidebar";
import { Topbar } from "@/shared/components/topbar";
import { authGuard } from "@/core/guards/auth.guard";

export const Route = createFileRoute("/_private")({
	beforeLoad: authGuard,
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
