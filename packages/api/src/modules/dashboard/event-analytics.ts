import type { PrismaClient } from "@muxima/db/prisma";

import type { EventStatus, EventType } from "../../shared/types/entities";
import { type BudgetAnalytics, budgetAnalytics } from "../budget/analytics";
import {
	type ChecklistAnalytics,
	checklistAnalytics,
} from "../checklist/analytics";
import { dedicationAnalytics } from "../dedication/analytics";
import { foodPlanAnalytics } from "../food-plan/analytics";
import {
	type GuestAnalytics,
	getGuestAnalytics,
	getTableAnalytics,
	type TableAnalytics,
} from "../guests/analytics";
import { inventoryAnalytics } from "../inventory/analytics";
import { invitationAnalytics } from "../invitations/analytics";
import {
	type SupplierAnalytics,
	supplierAnalytics,
} from "../suppliers/analytics";
import {
	getScheduleAnalytics,
	getTaskAnalytics,
	type ScheduleAnalytics,
	type TaskAnalytics,
} from "../tasks/analytics";

/**
 * Event-level analytics: the single aggregation the event dashboard and the
 * event summary report both consume.
 *
 * Every figure is produced by a per-module analytics module, each of which
 * delegates to the module's own service/repository. This file only composes —
 * it never re-derives a number.
 */

export type EventCountdown = {
	daysRemaining: number;
	hoursRemaining: number;
	isPast: boolean;
	/** `true` when the event has no date configured at all. */
	hasDate: boolean;
};

export type EventSummaryAnalytics = {
	event: {
		id: string;
		name: string;
		type: EventType;
		status: EventStatus;
		eventDate: Date | null;
		startTime: string | null;
		endTime: string | null;
		venueName: string | null;
		address: string | null;
		municipality: string | null;
		province: string | null;
		capacity: number | null;
		currency: string;
		description: string | null;
	};
	countdown: EventCountdown;
	guests: GuestAnalytics;
	invitations: Awaited<ReturnType<typeof invitationAnalytics.get>>;
	tables: TableAnalytics;
	schedule: ScheduleAnalytics;
	budget: BudgetAnalytics;
	suppliers: SupplierAnalytics;
	inventory: Awaited<ReturnType<typeof inventoryAnalytics.get>>;
	tasks: TaskAnalytics;
	checklist: ChecklistAnalytics;
	foodPlan: Awaited<ReturnType<typeof foodPlanAnalytics.get>>;
	dedications: Awaited<ReturnType<typeof dedicationAnalytics.get>> | null;
};

/** Days/hours until the event, or `isPast` once it has happened. */
export function computeCountdown(
	eventDate: Date | null,
	now = new Date(),
): EventCountdown {
	if (!eventDate) {
		return {
			daysRemaining: 0,
			hoursRemaining: 0,
			isPast: false,
			hasDate: false,
		};
	}

	const diff = eventDate.getTime() - now.getTime();
	if (diff <= 0) {
		return {
			daysRemaining: 0,
			hoursRemaining: 0,
			isPast: true,
			hasDate: true,
		};
	}

	return {
		daysRemaining: Math.floor(diff / 86_400_000),
		hoursRemaining: Math.floor((diff % 86_400_000) / 3_600_000),
		isPast: false,
		hasDate: true,
	};
}

/**
 * Aggregates every module of the event in parallel.
 *
 * `userId` is required because dedication statistics are privacy-scoped: the
 * aggregate is always relative to the requester, never to the whole event.
 */
export async function getEventSummaryAnalytics(
	client: PrismaClient,
	eventId: string,
	userId: string,
	now = new Date(),
): Promise<EventSummaryAnalytics | null> {
	const event = await client.event.findUnique({ where: { id: eventId } });
	if (!event) return null;

	const [
		guests,
		invitations,
		tables,
		schedule,
		budget,
		suppliers,
		inventory,
		tasks,
		checklist,
		foodPlan,
		dedications,
	] = await Promise.all([
		getGuestAnalytics(client, eventId),
		invitationAnalytics.get(eventId),
		getTableAnalytics(client, eventId),
		getScheduleAnalytics(client, eventId),
		budgetAnalytics.get(eventId),
		supplierAnalytics.get(eventId),
		inventoryAnalytics.get(eventId),
		getTaskAnalytics(client, eventId, now),
		checklistAnalytics.get(eventId),
		foodPlanAnalytics.get(eventId),
		dedicationAnalytics.get(eventId, userId).catch(() => null),
	]);

	return {
		event: {
			id: event.id,
			name: event.name,
			type: event.type as EventType,
			status: event.status as EventStatus,
			eventDate: event.eventDate,
			startTime: event.startTime,
			endTime: event.endTime,
			venueName: event.venueName,
			address: event.address,
			municipality: event.municipality,
			province: event.province,
			capacity: event.capacity,
			currency: event.currency,
			description: event.description,
		},
		countdown: computeCountdown(event.eventDate, now),
		guests,
		invitations,
		tables,
		schedule,
		budget,
		suppliers,
		inventory,
		tasks,
		checklist,
		foodPlan,
		dedications,
	};
}
