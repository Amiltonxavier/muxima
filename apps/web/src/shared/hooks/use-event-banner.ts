import { useMatches, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	type EventBannerData,
	type EventBannerMode,
	useEvent,
} from "@/shared/hooks/event-banner-queries";
import {
	composeEventEndAt,
	composeEventStartAt,
} from "@/shared/utils/event-date-time";

/**
 * Decides the visual state of the EventCountdownBanner (spec §16).
 *
 * Rules:
 * - No event in the route context           → HIDDEN (no empty banner, §12).
 * - DRAFT / PLANNING / CANCELLED events     → HIDDEN (temporal-inert, §6/§12).
 * - CONFIRMED with start in the future      → COUNTDOWN.
 * - ONGOING                                 → ONGOING (counts to the end).
 * - COMPLETED (or past end while the stored
 *   status still says CONFIRMED/ONGOING)    → COMPLETED.
 *
 * The event is read from the SAME TanStack Query cache used by the event
 * pages (`eventKeys.detail(id)`), so no request is duplicated (spec §17).
 */
export function useEventBanner(): EventBannerData {
	const params = useParams({ strict: false }) as { eventId?: string };
	const matches = useMatches();

	// Only show the banner while the user is really inside an event route
	// (e.g. /events/$eventId/...), not on /dashboard or global pages.
	const matchId = matches.at(-1)?.id ?? "";
	const isEventContext =
		typeof params.eventId === "string" &&
		params.eventId.length > 0 &&
		matchId.includes("events/$eventId");

	const eventId = isEventContext ? (params.eventId as string) : null;

	// The query is enabled only in an event context; elsewhere this resolves
	// to cached/no data and the banner stays hidden.
	const eventQuery = useEvent(eventId ?? "");
	const event = eventId ? (eventQuery.data ?? null) : null;

	const memo = useMemo(() => {
		if (!eventId || !event) {
			return {
				mode: "HIDDEN" as EventBannerMode,
				event: null,
				countdown: null,
			};
		}

		const status = event.status;
		const startAt = composeEventStartAt(event);
		const endAt = composeEventEndAt(event);
		const now = Date.now();

		// Temporal-inert statuses never show a banner (spec §6/§12).
		const participates =
			status === "CONFIRMED" || status === "ONGOING" || status === "COMPLETED";
		if (!participates || !startAt) {
			return {
				mode: "HIDDEN" as EventBannerMode,
				event: null,
				countdown: null,
			};
		}

		if (status === "COMPLETED") {
			return { mode: "COMPLETED" as EventBannerMode, event, countdown: null };
		}

		// ONGOING: countdown oriented to the END of the event (spec §10).
		if (status === "ONGOING") {
			if (endAt && now < endAt.getTime()) {
				return { mode: "ONGOING" as EventBannerMode, event, countdown: null };
			}
			return { mode: "COMPLETED" as EventBannerMode, event, countdown: null };
		}

		// CONFIRMED: countdown to the start. If the calendar already passed
		// the end but the stored status hasn't been synced yet, show the
		// completed copy — never a negative countdown (spec §11).
		if (endAt && now >= endAt.getTime()) {
			return { mode: "COMPLETED" as EventBannerMode, event, countdown: null };
		}

		return {
			mode: "COUNTDOWN" as EventBannerMode,
			event,
			countdown: { startAt, endAt },
		};
	}, [eventId, event]);

	return memo;
}

export type { EventBannerData, EventBannerMode };
