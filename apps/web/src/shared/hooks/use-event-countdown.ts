import { useEffect, useRef, useState } from "react";

export interface CountdownParts {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	totalMilliseconds: number;
	isExpired: boolean;
}

const EMPTY_COUNTDOWN: CountdownParts = {
	days: 0,
	hours: 0,
	minutes: 0,
	seconds: 0,
	totalMilliseconds: 0,
	isExpired: true,
};

/** Pure split of a non-negative millisecond duration into d/h/m/s. */
export function splitDuration(totalMilliseconds: number): CountdownParts {
	if (totalMilliseconds <= 0) {
		return EMPTY_COUNTDOWN;
	}
	const totalSeconds = Math.floor(totalMilliseconds / 1000);
	return {
		days: Math.floor(totalSeconds / 86_400),
		hours: Math.floor((totalSeconds % 86_400) / 3_600),
		minutes: Math.floor((totalSeconds % 3_600) / 60),
		seconds: totalSeconds % 60,
		totalMilliseconds,
		isExpired: false,
	};
}

/**
 * Ticks once per second until `targetDate` is reached.
 *
 * Design notes (spec §15/§18):
 * - Only local state is updated — no HTTP requests.
 * - A single interval per hook instance, cleared on unmount.
 * - Changing `targetDate` restarts the timer without stale ticks.
 * - Values never go negative: after expiry the countdown freezes at zero.
 * - `nowMs` is kept in a ref to avoid re-subscribing the effect.
 */
export function useEventCountdown(targetDate: Date | null): CountdownParts {
	const [remaining, setRemaining] = useState<CountdownParts>(() => {
		if (!targetDate) return EMPTY_COUNTDOWN;
		return splitDuration(targetDate.getTime() - Date.now());
	});

	const targetRef = useRef<Date | null>(targetDate);
	targetRef.current = targetDate;

	// Keyed on the primitive timestamp on purpose: a new Date object with the
	// same instant must not restart the timer, but a changed instant must.
	// biome-ignore lint/correctness/useExhaustiveDependencies: primitive key is intentional
	useEffect(() => {
		// Recompute immediately so a target change never shows a stale second.
		setRemaining(
			targetRef.current
				? splitDuration(targetRef.current.getTime() - Date.now())
				: EMPTY_COUNTDOWN,
		);

		if (!targetRef.current) {
			return;
		}

		const interval = setInterval(() => {
			setRemaining(
				targetRef.current
					? splitDuration(targetRef.current.getTime() - Date.now())
					: EMPTY_COUNTDOWN,
			);
		}, 1000);

		return () => clearInterval(interval);
	}, [targetDate?.getTime()]);

	return remaining;
}
