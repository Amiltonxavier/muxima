import type { AppRouterClient } from "@muxima/api/routers/index";
import { env } from "@muxima/env/web";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	handleApiError,
	parseApiError,
	SESSION_EXPIRED_MESSAGE,
} from "@/shared/errors";
import { buildLoginUrl } from "./auth-redirect";

/**
 * Every query and mutation failure is reported through `handleApiError`, the one
 * place that turns an API payload into a PT-PT message. Components therefore
 * never toast `error.message` themselves.
 */
export function createQueryClient() {
	return new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				handleApiError(error, {
					toastOptions: {
						action: {
							label: "Tentar novamente",
							onClick: () => {
								query.invalidate();
							},
						},
					},
				});
			},
		}),
		mutationCache: new MutationCache({
			onError: (error) => {
				handleApiError(error);
			},
		}),
	});
}

export const queryClient = createQueryClient();

function getServerUrl(url: string) {
	const processEnv = (
		globalThis as {
			process?: { env?: Record<string, string | undefined> };
		}
	).process?.env;
	if (typeof window === "undefined" && processEnv?.SERVER_URL) {
		return processEnv.SERVER_URL.endsWith("/")
			? processEnv.SERVER_URL.slice(0, -1)
			: processEnv.SERVER_URL;
	}

	const normalized = url.endsWith("/") ? url.slice(0, -1) : url;

	if (!normalized.startsWith("/")) {
		return normalized;
	}

	if (typeof window !== "undefined") {
		return `${window.location.origin}${normalized}`;
	}

	const vercelUrl =
		processEnv?.VERCEL_ENV === "production"
			? (processEnv?.VERCEL_PROJECT_PRODUCTION_URL ?? processEnv?.VERCEL_URL)
			: (processEnv?.VERCEL_URL ?? processEnv?.VERCEL_PROJECT_PRODUCTION_URL);
	if (vercelUrl) {
		const origin = vercelUrl.startsWith("http")
			? vercelUrl
			: `https://${vercelUrl}`;
		return `${origin}${normalized}`;
	}

	return `http://localhost:3000${normalized}`;
}
export const link = new RPCLink({
	url: `${getServerUrl(env.VITE_SERVER_URL)}/rpc`,
	// `.route({ method: "GET" })` on a procedure changes the generated OpenAPI
	// spec only. Turning it into a real HTTP GET needs the router instance, which
	// cannot be imported here: a runtime import of `@muxima/api` would pull
	// Prisma and the server env into the browser bundle and throw at load. So the
	// wire stays POST and the GET declaration remains documentation, which is the
	// pre-existing behaviour of every procedure in this app.
	fetch(url, options) {
		return fetch(url, {
			...options,
			credentials: "include",
		}).then(async (response) => {
			if (response.status === 401) {
				if (typeof window !== "undefined") {
					const currentPath = window.location.pathname + window.location.search;
					if (
						!currentPath.startsWith("/login") &&
						!currentPath.startsWith("/register") &&
						!currentPath.startsWith("/invite/")
					) {
						// Evitar múltiplos redirects/toasts concorrentes
						if (typeof (window as any).__isHandling401 === "undefined") {
							(window as any).__isHandling401 = false;
						}
						if ((window as any).__isHandling401) {
							return response;
						}
						(window as any).__isHandling401 = true;
						// The session guard is a navigation concern, so it stays
						// here; the wording comes from the shared error module.
						const info = parseApiError({ status: 401 });
						toast.error(info.message || SESSION_EXPIRED_MESSAGE);

						// Sanitizar returnTo: apenas destinos internos
						const returnTo =
							window.location.pathname +
							window.location.search +
							window.location.hash;
						const loginUrl = buildLoginUrl(returnTo, window.location.origin);
						window.location.href = loginUrl;
					}
				}
			}
			return response;
		});
	},
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
