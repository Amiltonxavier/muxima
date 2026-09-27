import {
	composeEndAt,
	composeStartAt,
} from "@muxima/api/modules/events/lifecycle";

// NOTE: the database client is imported lazily inside `notifyEventMilestone`
// so the pure builder below (and this module) can be unit-tested without
// validating environment variables. Nothing else in this module touches db.

/**
 * Proximity notifications (spec §13/§14).
 *
 * When the user is NOT inside a specific event, the countdown experience is
 * delivered through the notification system instead of a global banner. To
 * avoid notification spam (spec §14), every milestone maps to a deterministic
 * (title, message) pair and creation is idempotent per (user, event, pair):
 * a milestone that already produced a notification never produces another.
 *
 * Milestones: 30 / 14 / 7 / 3 / 1 days, today-at-time, ongoing, completed.
 */

/** Ordered milestones, in days before the event start. */
export const PROXIMITY_MILESTONES_DAYS = [30, 14, 7, 3, 1] as const;

/** Message templates per milestone (pt-PT). */
const MILESTONE_MESSAGES: Record<number, string> = {
	30: "O teu evento acontece daqui a 30 dias.",
	14: "O teu evento acontece daqui a 14 dias.",
	7: "O teu evento acontece daqui a 7 dias.",
	3: "O teu evento acontece daqui a 3 dias.",
	1: "O teu evento acontece amanhã.",
};

/** Fixed title shared by all countdown notifications, so the bell stays tidy. */
const PROXIMITY_TITLE = "O teu evento aproxima-se";

const ONGOING_TITLE = "O teu evento está a decorrer";
const ONGOING_MESSAGE = "O evento está neste momento a decorrer.";

const COMPLETED_TITLE = "Evento concluído";
const COMPLETED_MESSAGE = "O evento terminou. Esperamos que tenha corrido bem!";

export interface MilestoneEventInput {
	id: string;
	status: string;
	eventDate: Date | null;
	startTime: string | null;
	endTime: string | null;
}

/**
 * Build the notification payload for the milestone an event is currently in.
 * Returns null when no milestone applies (e.g. DRAFT, no date, already
 * notified). Pure and exported for tests.
 */
export function buildMilestoneNotification(
	event: MilestoneEventInput,
	options: { now?: Date } = {},
): { milestone: string; title: string; message: string } | null {
	// DRAFT / CANCELLED events never participate (spec §6/§12).
	if (event.status === "DRAFT" || event.status === "CANCELLED") return null;

	const startAt = composeStartAt(event);
	if (!startAt) return null;

	const now = options.now ?? new Date();
	const nowMs = now.getTime();
	const endAt = composeEndAt(event);

	if (endAt && nowMs >= endAt.getTime()) {
		return {
			milestone: "completed",
			title: COMPLETED_TITLE,
			message: COMPLETED_MESSAGE,
		};
	}

	if (nowMs >= startAt.getTime()) {
		return {
			milestone: "ongoing",
			title: ONGOING_TITLE,
			message: ONGOING_MESSAGE,
		};
	}

	// ── Pre-event milestones ─────────────────────────────────────────
	// Same-day check MUST come first: with the event later today,
	// daysRemaining floors to 0 and would otherwise match the d1 ("amanhã")
	// milestone instead of the correct "hoje" one.
	const sameDay =
		startAt.getFullYear() === now.getFullYear() &&
		startAt.getMonth() === now.getMonth() &&
		startAt.getDate() === now.getDate();
	if (sameDay) {
		const hh = String(startAt.getHours()).padStart(2, "0");
		const mm = String(startAt.getMinutes()).padStart(2, "0");
		return {
			milestone: "today",
			title: PROXIMITY_TITLE,
			message: `O teu evento acontece hoje às ${hh}:${mm}.`,
		};
	}

	// Then the day-based milestones: the milestone is the SMALLEST threshold
	// that still covers the remaining days (7 days left → d7, not d30), so
	// iterate ascending and take the first match.
	const daysRemaining = Math.floor((startAt.getTime() - nowMs) / 86_400_000);
	for (const days of [...PROXIMITY_MILESTONES_DAYS].sort((a, b) => a - b)) {
		if (daysRemaining <= days) {
			return {
				milestone: `d${days}`,
				title: PROXIMITY_TITLE,
				// The d1 milestone uses the fixed "amanhã" copy: with less than a
				// full day left, floor(daysRemaining) would be 0. Other milestones
				// reflect the REAL remaining days ("daqui a 26 dias"), matching the
				// spec examples ("daqui a 2 meses", "daqui a 10 dias").
				message:
					days === 1
						? (MILESTONE_MESSAGES[days] ?? "O teu evento acontece amanhã.")
						: `O teu evento acontece daqui a ${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"}.`,
			};
		}
	}

	return null;
}

/**
 * Ensure the current milestone notification exists for one event owner.
 * Idempotent: re-running for the same milestone is a no-op.
 */
export async function notifyEventMilestone(event: {
	id: string;
	ownerId: string;
	name: string;
	status: string;
	eventDate: Date | null;
	startTime: string | null;
	endTime: string | null;
}): Promise<void> {
	const { default: db } = await import("@muxima/db");

	const milestone = buildMilestoneNotification(event);
	if (!milestone) return;

	const existing = await db.notification.findFirst({
		where: {
			userId: event.ownerId,
			eventId: event.id,
			title: milestone.title,
			message: milestone.message,
		},
		select: { id: true },
	});
	if (existing) return;

	await db.notification.create({
		data: {
			userId: event.ownerId,
			eventId: event.id,
			type: "EVENT",
			title: milestone.title,
			message: milestone.message,
			priority: "INFO",
		},
	});
}
