import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { LoadingState } from "@/shared/components/states/loading-state";
import { Sidebar } from "@/shared/components/sidebar";
import { Topbar } from "@/shared/components/topbar";

export const Route = createFileRoute("/_private")({
	beforeLoad: async () => {
		try {
			const { data: session, error } = await authClient.getSession();
			// Only redirect to login when the session is genuinely absent.
			// A server error (500 / network) must NOT cause a logout.
			if (!session && !error) {
				throw redirect({ to: "/login" });
			}
			if (error) {
				// Server returned an error — treat as "session check failed".
				// Do NOT redirect; let the app render and retry on next navigation.
				return;
			}
		} catch (e) {
			// If the error is a redirect from TanStack Router, rethrow it
			if (e && typeof e === "object" && "isRedirect" in e) {
				throw e;
			}
			// For any other error (network failure, etc.), don't redirect.
			// The app will show an error state or retry on navigation.
			return;
		}
	},
	pendingComponent: LoadingState,
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
