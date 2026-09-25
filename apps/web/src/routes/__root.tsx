import type { AppRouterClient } from "@muxima/api/routers/index";
import { Toaster } from "@muxima/ui/components/sonner";
import { createORPCClient } from "@orpc/client";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ErrorComponentProps } from "@tanstack/react-router";
import {
	createRootRouteWithContext,
	ErrorComponent,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { link, type orpc } from "@/utils/orpc";

import "../index.css";

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	errorComponent: RootError,
	head: () => ({
		meta: [
			{
				title: "Muxima",
			},
			{
				name: "description",
				content: "Gestão de noivados e casamentos",
			},
		],
		links: [
			{
				rel: "icon",
				href: "/favicon.ico",
			},
		],
	}),
});

function RootError({ error, reset }: ErrorComponentProps) {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-4">
			<ErrorComponent error={error} />
			<button
				type="button"
				className="bg-primary px-4 py-2 text-primary-foreground text-sm"
				onClick={() => reset()}
			>
				Tentar novamente
			</button>
		</div>
	);
}

function RootComponent() {
	const [_client] = useState<AppRouterClient>(() => createORPCClient(link));

	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<Outlet />
				<Toaster richColors />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
