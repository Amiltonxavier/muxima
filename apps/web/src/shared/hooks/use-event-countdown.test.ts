import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { splitDuration, useEventCountdown } from "./use-event-countdown";

describe("splitDuration", () => {
	it("splits seconds", () => {
		expect(splitDuration(10_000)).toMatchObject({
			days: 0,
			hours: 0,
			minutes: 0,
			seconds: 10,
			isExpired: false,
		});
	});

	it("splits minutes and hours", () => {
		// 1h 01m 05s
		expect(splitDuration(3_665_000)).toMatchObject({
			days: 0,
			hours: 1,
			minutes: 1,
			seconds: 5,
		});
	});

	it("splits days", () => {
		// 2d 03h 04m 05s
		expect(
			splitDuration(((2 * 24 + 3) * 3_600 + 4 * 60 + 5) * 1000),
		).toMatchObject({ days: 2, hours: 3, minutes: 4, seconds: 5 });
	});

	it("never returns negative parts for expired targets", () => {
		const result = splitDuration(-5_000);
		expect(result.isExpired).toBe(true);
		expect(result.totalMilliseconds).toBe(0);
		expect(result.seconds).toBe(0);
	});
});

describe("useEventCountdown", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("counts down every second", () => {
		const target = new Date(Date.now() + 10_000);
		const { result } = renderHook(() => useEventCountdown(target));

		expect(result.current.seconds).toBe(10);

		act(() => {
			vi.advanceTimersByTime(3_000);
		});

		expect(result.current.seconds).toBe(7);
	});

	it("freezes at zero after expiry without negative values", () => {
		const target = new Date(Date.now() + 2_000);
		const { result } = renderHook(() => useEventCountdown(target));

		act(() => {
			vi.advanceTimersByTime(60_000);
		});

		expect(result.current.isExpired).toBe(true);
		expect(result.current.totalMilliseconds).toBe(0);
		expect(result.current.seconds).toBe(0);
	});

	it("restarts when the target date changes", () => {
		const first = new Date(Date.now() + 10_000);
		const { result, rerender } = renderHook(
			({ target }) => useEventCountdown(target),
			{ initialProps: { target: first } },
		);

		const second = new Date(Date.now() + 120_000);
		rerender({ target: second });

		expect(result.current.totalMilliseconds).toBeGreaterThan(100_000);
	});

	it("clears the interval on unmount (no leaks)", () => {
		const clearSpy = vi.spyOn(globalThis, "clearInterval");
		const target = new Date(Date.now() + 60_000);
		const { unmount } = renderHook(() => useEventCountdown(target));

		unmount();
		expect(clearSpy).toHaveBeenCalled();
		clearSpy.mockRestore();
	});
});
