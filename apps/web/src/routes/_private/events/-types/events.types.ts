import type { z } from "zod";
import type { createEventSchema } from "@/utils/event-schemas";
import type { EventFilters, useEvents } from "../-queries/event-queries";

type EventsQueryData = NonNullable<ReturnType<typeof useEvents>["data"]>;

/**
 * One card in the grid. Derived from the query output so it cannot drift from
 * what the API actually returns — the previous version typed the list as
 * `Record<string, unknown>` and asserted every field access.
 */
export type EventListItem = EventsQueryData["data"][number];

/**
 * The Prisma `EventType` enum has eleven values, but the list query only
 * filters on these two, so the filter types come from the query contract rather
 * than from the wide enum.
 */
export type EventStatusFilter = NonNullable<EventFilters["status"]> | "ALL";
export type EventTypeFilter = NonNullable<EventFilters["type"]> | "ALL";

/** The create schema is the other gate on the type, and it allows the same two. */
export type CreatableEventType = z.infer<typeof createEventSchema>["type"];

/** What the form holds: every field editable, numbers pre-filled as 0. */
export interface CreateEventFormValues {
	name: string;
	type: CreatableEventType;
	eventDate: string;
	startTime: string;
	endTime: string;
	venueName: string;
	address: string;
	province: string;
	municipality: string;
	neighborhood: string;
	reference: string;
	description: string;
	capacity: number;
	budgetAmount: number;
}
