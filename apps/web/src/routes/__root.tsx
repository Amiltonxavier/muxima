import type { AppRouterClient } from "@muxima/api/routers/index";
import { Button } from "@muxima/ui/components/button";
import { Toaster } from "@muxima/ui/components/sonner";
import { createORPCClient } from "@orpc/client";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { ErrorComponentProps } from "@tanstack/react-router";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { AlertTriangle, RotateCcw, SearchX, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { BackToAppButton, StatusPage } from "@/shared/components/status-page";
import { link, type orpc } from "@/utils/orpc";

import "../index.css";

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	errorComponent: RootError,
	notFoundComponent: NotFoundPage,
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

/**
 * Ecrã de recurso inexistente. Apanha o `notFoundComponent` do router, para que
 * qualquer URL sem rota caia aqui em vez de no ecrã de erro genérico.
 */
function NotFoundPage() {
	return (
		<StatusPage
			icon={SearchX}
			title="Página não encontrada"
			description="O endereço que abriu não existe, ou o conteúdo foi movido ou removido."
			action={<BackToAppButton label="Voltar ao início" />}
		/>
	);
}

/**
 * Limiar de acesso negado, em qualquer ponto da aplicação. A API responde
 * `FORBIDDEN` a um utilizador autenticado sem permissão sobre o recurso, e o
 * router entrega esse erro aqui — por isso esta variante é necessária para
 * além da rota `/403`.
 */
function ForbiddenPage() {
	return (
		<StatusPage
			icon={ShieldAlert}
			title="Acesso negado"
			description="Não tem permissão para aceder a esta área. Se acha que se trata de um engano, peça ao responsável do evento para lhe conceder acesso."
			action={<BackToAppButton label="Voltar ao início" />}
		/>
	);
}

/**
 * Limiar global de erro. Só distingue os estados que o utilizador pode
 * resolver — acesso negado, recurso inexistente, inesperado — e nunca renderiza
 * mensagem ou a stack do erro: internos são detalhe de diagnóstico, e ficam nos
 * logs do servidor.
 */
function RootError({ error, reset }: ErrorComponentProps) {
	const code = (error as { code?: string } | undefined)?.code;

	if (code === "FORBIDDEN") {
		return <ForbiddenPage />;
	}

	if (code === "NOT_FOUND") {
		return <NotFoundPage />;
	}

	return (
		<StatusPage
			icon={AlertTriangle}
			title="Ocorreu um erro inesperado"
			description="Não foi possível concluir este pedido. Tente novamente — se o problema persistir, contacte o suporte."
			action={
				<Button size="sm" onClick={() => reset()}>
					<RotateCcw className="mr-2 h-4 w-4" />
					Tentar novamente
				</Button>
			}
			secondaryAction={<BackToAppButton label="Voltar ao início" />}
		/>
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
