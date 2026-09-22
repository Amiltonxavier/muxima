import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { LoadingState } from "@/shared/components/states/loading-state";

export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => {
		try {
			const { data: session } = await authClient.getSession();
			if (session) {
				throw redirect({ to: "/" });
			}
		} catch (e) {
			// If it's a redirect from TanStack Router, rethrow it
			if (e && typeof e === "object" && "isRedirect" in e) {
				throw e;
			}
			// On error, let the user see the auth page
			return;
		}
	},
	pendingComponent: LoadingState,
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
			<div className="w-full max-w-sm">
				<div className="mb-8 flex flex-col items-center gap-2">
					<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
						<Gift className="h-6 w-6 text-primary" />
					</div>
					<h1 className="font-semibold text-xl">Muxima</h1>
					<p className="text-center text-muted-foreground text-sm">
						Gestão de noivados e casamentos
					</p>
				</div>
				<Outlet />
			</div>
		</div>
	);
}
