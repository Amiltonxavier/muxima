import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
	params: { eventId: undefined as string | undefined },
}));

vi.mock("@tanstack/react-router", () => ({
	useParams: () => hoisted.params,
}));

import { useEventLock } from "../use-event-lock";

const EVENT_ID = "evt_lock";
const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

function makeEvent(overrides: Record<string, unknown> = {}) {
	return {
		id: EVENT_ID,
		name: "Casamento",
		type: "WEDDING",
		status: "CONFIRMED",
		eventDate: new Date(Date.now() + DAY_MS).toISOString(),
		startTime: "18:00",
		endTime: "23:00",
		maxGuestsPerInvitation: 2,
		...overrides,
	};
}

/**
 * Event whose `eventDate` + `startTime` compose to exactly `offsetMs` before
 * now. Both fields are derived from the same instant so the rule under test
 * (date AND hour precision) is exercised deterministically, whatever the
 * clock says when the suite runs.
 */
function eventHappenedAgo(
	offsetMs: number,
	overrides: Record<string, unknown> = {},
) {
	const at = new Date(Date.now() - offsetMs);
	const pad = (value: number) => String(value).padStart(2, "0");

	return makeEvent({
		eventDate: at.toISOString(),
		startTime: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
		...overrides,
	});
}

function createWrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

describe("useEventLock", () => {
	let queryClient: QueryClient;
	let wrapper: ReturnType<typeof createWrapper>;

	beforeEach(() => {
		hoisted.params = { eventId: EVENT_ID };
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		wrapper = createWrapper(queryClient);
	});

	function renderWithEvent(event: Record<string, unknown>) {
		queryClient.setQueryData(["events", "detail", EVENT_ID], event);
		return renderHook(() => useEventLock(), { wrapper });
	}

	it("reports a CANCELLED event as locked with PT-PT feedback", () => {
		const { result } = renderWithEvent(makeEvent({ status: "CANCELLED" }));

		expect(result.current.isEventLocked).toBe(true);
		expect(result.current.lockReason).toBe("CANCELLED");
		expect(result.current.lockMessage).toBe(
			"Este evento foi cancelado e não permite alterações.",
		);
	});

	it("keeps an event that happened 1 day ago operational", () => {
		const { result } = renderWithEvent(eventHappenedAgo(1 * DAY_MS));

		expect(result.current.isEventLocked).toBe(false);
		expect(result.current.lockMessage).toBeNull();
	});

	it("keeps an event that happened 4 days ago operational", () => {
		const { result } = renderWithEvent(eventHappenedAgo(4 * DAY_MS));

		expect(result.current.isEventLocked).toBe(false);
	});

	it("keeps an event COMPLETED 2 days ago inside the 5-day window", () => {
		const { result } = renderWithEvent(
			eventHappenedAgo(2 * DAY_MS, { status: "COMPLETED" }),
		);

		expect(result.current.isEventLocked).toBe(false);
	});

	it("keeps an event at exactly 5 days (the limit is exclusive)", () => {
		// `composeStartAt` works at minute precision, so the boundary can only
		// be asserted against a frozen clock: `now` and the event's composed
		// start are exactly 5 days apart, to the millisecond.
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));

			const { result } = renderWithEvent(
				makeEvent({
					eventDate: new Date(2026, 5, 10, 12, 0, 0).toISOString(),
					startTime: "12:00",
				}),
			);

			expect(result.current.isEventLocked).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("locks one minute after the 5-day limit", () => {
		const { result } = renderWithEvent(
			eventHappenedAgo(5 * DAY_MS + MINUTE_MS),
		);

		expect(result.current.isEventLocked).toBe(true);
		expect(result.current.lockReason).toBe("EXPIRED");
		expect(result.current.lockMessage).toBe(
			"Este evento já ultrapassou o período permitido para alterações.",
		);
	});

	it("locks a COMPLETED event that has no date", () => {
		const { result } = renderWithEvent(
			makeEvent({ status: "COMPLETED", eventDate: null }),
		);

		expect(result.current.isEventLocked).toBe(true);
		expect(result.current.lockReason).toBe("COMPLETED");
		expect(result.current.lockMessage).toBe(
			"Este evento foi concluído e não permite alterações.",
		);
	});

	it("stays unlocked outside an event route", () => {
		hoisted.params = { eventId: undefined };
		queryClient.setQueryData(["events", "detail", EVENT_ID], makeEvent());

		const { result } = renderHook(() => useEventLock(), { wrapper });

		expect(result.current.eventId).toBeNull();
		expect(result.current.isEventLocked).toBe(false);
	});
});
