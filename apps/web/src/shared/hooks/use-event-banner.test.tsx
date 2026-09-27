import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
	params: { eventId: undefined as string | undefined },
	matchId: "",
}));

vi.mock("@tanstack/react-router", () => ({
	useParams: () => hoisted.params,
	useMatches: () => [
		{ id: hoisted.matchId ? `/private/${hoisted.matchId}` : "" },
	],
}));

import { useEventBanner } from "./use-event-banner";

function makeEvent(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "evt_008",
		name: "Workshop de Criatividade",
		type: "WORKSHOP",
		status: "CONFIRMED",
		eventDate: new Date(Date.now() + 5 * 86_400_000).toISOString(),
		startTime: "15:00",
		endTime: "23:00",
		members: [],
		budget: null,
		...overrides,
	};
}

function createWrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

function setCachedEvent(queryClient: QueryClient, event: unknown) {
	queryClient.setQueryData(["events", "detail", "evt_008"], event);
}

describe("useEventBanner", () => {
	let queryClient: QueryClient;
	let wrapper: ReturnType<typeof createWrapper>;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		wrapper = createWrapper(queryClient);
		setCachedEvent(queryClient, makeEvent());
	});

	it("is HIDDEN outside of an event context (e.g. /dashboard)", () => {
		hoisted.params = { eventId: undefined };
		hoisted.matchId = "";

		const { result } = renderHook(() => useEventBanner(), { wrapper });

		expect(result.current.mode).toBe("HIDDEN");
		expect(result.current.event).toBeNull();
	});

	it("is HIDDEN for DRAFT events even inside the event context", () => {
		hoisted.params = { eventId: "evt_008" };
		hoisted.matchId = "events/$eventId";
		queryClient.setQueryData(
			["events", "detail", "evt_008"],
			makeEvent({ status: "DRAFT" }),
		);

		const { result } = renderHook(() => useEventBanner(), { wrapper });

		expect(result.current.mode).toBe("HIDDEN");
	});

	it("shows COUNTDOWN for a CONFIRMED future event", () => {
		hoisted.params = { eventId: "evt_008" };
		hoisted.matchId = "events/$eventId";

		const { result } = renderHook(() => useEventBanner(), { wrapper });

		expect(result.current.mode).toBe("COUNTDOWN");
		expect(result.current.countdown?.startAt).toBeInstanceOf(Date);
	});

	it("shows ONGOING when the status is ONGOING and the event has not ended", () => {
		hoisted.params = { eventId: "evt_008" };
		hoisted.matchId = "events/$eventId";
		queryClient.setQueryData(
			["events", "detail", "evt_008"],
			makeEvent({
				status: "ONGOING",
				eventDate: new Date(Date.now() - 3_600_000).toISOString(),
			}),
		);

		const { result } = renderHook(() => useEventBanner(), { wrapper });

		expect(result.current.mode).toBe("ONGOING");
	});

	it("shows COMPLETED when the status is COMPLETED", () => {
		hoisted.params = { eventId: "evt_008" };
		hoisted.matchId = "events/$eventId";
		queryClient.setQueryData(
			["events", "detail", "evt_008"],
			makeEvent({
				status: "COMPLETED",
				eventDate: new Date(Date.now() - 5 * 86_400_000).toISOString(),
			}),
		);

		const { result } = renderHook(() => useEventBanner(), { wrapper });

		expect(result.current.mode).toBe("COMPLETED");
	});

	it("never shows a negative countdown when the end passed but status lags", () => {
		hoisted.params = { eventId: "evt_008" };
		hoisted.matchId = "events/$eventId";
		queryClient.setQueryData(
			["events", "detail", "evt_008"],
			makeEvent({
				status: "CONFIRMED",
				eventDate: new Date(Date.now() - 3 * 86_400_000).toISOString(),
			}),
		);

		const { result } = renderHook(() => useEventBanner(), { wrapper });

		expect(result.current.mode).toBe("COMPLETED");
	});

	it("updates when navigating between two events", () => {
		hoisted.matchId = "events/$eventId";
		hoisted.params = { eventId: "evt_008" };
		setCachedEvent(
			queryClient,
			makeEvent({
				eventDate: new Date(Date.now() + 90 * 86_400_000).toISOString(),
			}),
		);

		const { result, rerender } = renderHook(() => useEventBanner(), {
			wrapper,
		});
		expect(result.current.mode).toBe("COUNTDOWN");

		// Navigate to another event with no cached data yet.
		hoisted.params = { eventId: "evt_009" };
		queryClient.setQueryData(["events", "detail", "evt_009"], undefined);
		rerender();

		expect(result.current.event?.id ?? null).not.toBe("evt_008");
	});
});
