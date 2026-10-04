import {
	type EventLockReason,
	eventLockMessage,
	getEventLockReason,
} from "@muxima/api/shared/events/event-lock";
import { useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { useEvent } from "@/routes/_private/events/-queries/event-queries";

/**
 * Frontend mirror of the backend operational lock (`EVENT_LOCKED`).
 *
 * The rule itself lives in `@muxima/api/shared/events/event-lock` — the very
 * same pure module the server uses — so the two surfaces can never drift.
 * This hook only resolves the current event from the shared TanStack Query
 * cache (`eventKeys.detail(id)`, already populated by the event layout) and
 * evaluates the rule against it.
 *
 * It exists purely for UX: actions are disabled *before* the user clicks
 * them. The backend re-validates every mutation independently — this check is
 * never a security mechanism.
 *
 * Usage (any component under `/events/$eventId`):
 *
 * ```tsx
 * const { isEventLocked, lockMessage } = useEventLock();
 * <Button disabled={isEventLocked} title={lockMessage ?? undefined}>…</Button>
 * ```
 */
export interface EventLockState {
	/** `null` when the component is not inside an event route. */
	eventId: string | null;
	/** True when the event rejects data mutations (`409 EVENT_LOCKED`). */
	isEventLocked: boolean;
	/** Why the event is locked (`CANCELLED` | `COMPLETED` | `EXPIRED`). */
	lockReason: EventLockReason | null;
	/** Single PT-PT feedback for the reason — `null` while mutable. */
	lockMessage: string | null;
	/** Whether the event query is still running (treated as not locked). */
	isLoading: boolean;
}

const MUTABLE: EventLockState = {
	eventId: null,
	isEventLocked: false,
	lockReason: null,
	lockMessage: null,
	isLoading: false,
};

/** The transport may deliver the date as an ISO string or as a Date. */
function toDateOrNull(value: Date | string | null | undefined): Date | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function useEventLock(): EventLockState {
	const params = useParams({ strict: false }) as { eventId?: string };
	const eventId =
		typeof params.eventId === "string" && params.eventId.length > 0
			? params.eventId
			: null;

	const eventQuery = useEvent(eventId ?? "");
	const event = eventId ? (eventQuery.data ?? null) : null;

	return useMemo(() => {
		if (!eventId || !event) {
			return { ...MUTABLE, eventId, isLoading: eventQuery.isLoading };
		}

		const reason = getEventLockReason({
			status: event.status,
			eventDate: toDateOrNull(event.eventDate),
			startTime: event.startTime ?? null,
		});

		return {
			eventId,
			isEventLocked: reason !== null,
			lockReason: reason,
			lockMessage: reason ? eventLockMessage(reason) : null,
			isLoading: eventQuery.isLoading,
		};
	}, [eventId, event, eventQuery.isLoading]);
}
