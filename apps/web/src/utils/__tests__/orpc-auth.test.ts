import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@orpc/client", () => ({
	createORPCClient: vi.fn(),
}));
vi.mock("@orpc/client/fetch", () => ({
	RPCLink: class MockLink {
		constructor(opts: any) {
			(this as any).opts = opts;
			(globalThis as any).__rpcFetch = opts.fetch;
		}
		fetch = (url: string, opts: any) => (this as any).opts.fetch(url, opts);
	} as any,
}));
vi.mock("@orpc/tanstack-query", () => ({
	createTanstackQueryUtils: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
	MutationCache: vi.fn(),
	QueryCache: vi.fn(),
	QueryClient: vi.fn(),
}));
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
}));

vi.mock("@/shared/errors", () => ({
	handleApiError: vi.fn(),
	parseApiError: vi.fn(() => ({ message: "Sessão expirada" })),
	SESSION_EXPIRED_MESSAGE: "A sua sessão expirou",
}));

vi.mock("@muxima/env/web", () => ({
	env: {
		VITE_SERVER_URL: "http://localhost:3000",
	},
}));

describe("oRPC 401 deduplication and returnTo", () => {
	const originalWindow = globalThis.window;
	let mockToast: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();
		const sonner = await import("sonner");
		mockToast = vi.mocked(sonner.toast.error);
		Object.defineProperty(globalThis, "window", {
			value: {
				location: {
					pathname: "/dashboard",
					search: "?tab=events",
					hash: "#section",
					origin: "http://localhost:3000",
					href: "",
				},
			},
			writable: true,
		});
		delete (globalThis as any).__isHandling401;
	});

	afterEach(() => {
		Object.defineProperty(globalThis, "window", {
			value: originalWindow,
			writable: true,
		});
		vi.resetAllMocks();
		delete (globalThis as any).__isHandling401;
	});

	it("redirects once with safe returnTo when 401 occurs", async () => {
		const { link } = await import("../orpc");
		const fetchFn = ((globalThis as any).__rpcFetch || (link as any).fetch) as (
			url: string,
			opts: any,
		) => Promise<Response>;
		(globalThis as any).fetch = () =>
			Promise.resolve({ status: 401, ok: false } as any);
		await fetchFn("http://localhost:3000/rpc", { method: "POST" }).catch(
			() => {},
		);
		expect(mockToast).toHaveBeenCalledTimes(1);
		expect(globalThis.window.location.href).toBe(
			"/login?returnTo=%2Fdashboard%3Ftab%3Devents%23section",
		);
	});

	it("prevents multiple redirects when multiple 401s occur simultaneously", async () => {
		const { link } = await import("../orpc");
		const fetchFn = ((globalThis as any).__rpcFetch || (link as any).fetch) as (
			url: string,
			opts: any,
		) => Promise<Response>;
		const calls = [
			fetchFn("http://localhost:3000/rpc", { method: "POST" }),
			fetchFn("http://localhost:3000/rpc", { method: "POST" }),
			fetchFn("http://localhost:3000/rpc", { method: "POST" }),
		];
		await Promise.allSettled(calls);
		expect(mockToast).toHaveBeenCalledTimes(1);
		expect(globalThis.window.location.href).toBe(
			"/login?returnTo=%2Fdashboard%3Ftab%3Devents%23section",
		);
	});
});
