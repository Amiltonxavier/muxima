import {
	composeEndAt,
	composeStartAt,
} from "@muxima/api/modules/events/lifecycle";
import { notifyEventMilestone } from "@muxima/api/modules/events/proximity-notifier";
import { createPrismaClient } from "@muxima/db";
import type { EventStatus } from "@muxima/db/prisma";

/**
 * Background lifecycle worker (spec §5/§7/§14).
 *
 * Responsibilities:
 * 1. Persist temporal transitions (CONFIRMED→ONGOING→COMPLETED) for events
 *    nobody has opened recently — the lazy read-path sync misses those.
 * 2. Emit proximity notification milestones for confirmed events.
 *
 * It runs on a coarse interval (default 15 min, configurable via
 * `EVENT_LIFECYCLE_INTERVAL_MS`) — never per-second. Uses its own Prisma
 * client so it can also be started standalone (`tsx src/jobs/event-lifecycle.ts`).
 */

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

function getIntervalMs(): number {
	const raw = process.env.EVENT_LIFECYCLE_INTERVAL_MS;
	if (!raw) return DEFAULT_INTERVAL_MS;
	const parsed = Number(raw);
	return Number.isFinite(parsed) && parsed >= 60_000
		? parsed
		: DEFAULT_INTERVAL_MS;
}

/** Batch size for a single sweep. Keeps memory bounded on large datasets. */
const SWEEP_BATCH = 200;

export async function runLifecycleSweep(): Promise<{
	swept: number;
	statusChanges: number;
	notifications: number;
}> {
	const db = createPrismaClient();
	let swept = 0;
	let statusChanges = 0;
	let notifications = 0;

	try {
		const now = new Date();

		// Only events that can participate in the temporal lifecycle.
		const events = await db.event.findMany({
			where: {
				status: { in: ["CONFIRMED", "ONGOING"] },
				eventDate: { not: null },
			},
			select: {
				id: true,
				ownerId: true,
				name: true,
				status: true,
				eventDate: true,
				startTime: true,
				endTime: true,
			},
			take: SWEEP_BATCH,
			orderBy: { updatedAt: "asc" },
		});

		for (const event of events) {
			swept += 1;

			const startAt = composeStartAt(event);
			const endAt = composeEndAt(event);
			if (!startAt) continue;

			const nowMs = now.getTime();
			let nextStatus: EventStatus | null = null;

			if (event.status === "CONFIRMED") {
				if (endAt && nowMs >= endAt.getTime()) nextStatus = "COMPLETED";
				else if (nowMs >= startAt.getTime()) nextStatus = "ONGOING";
			} else if (
				event.status === "ONGOING" &&
				endAt &&
				nowMs >= endAt.getTime()
			) {
				nextStatus = "COMPLETED";
			}

			if (nextStatus && nextStatus !== event.status) {
				await db.event.update({
					where: { id: event.id },
					data: { status: nextStatus },
				});
				statusChanges += 1;
			}

			try {
				await notifyEventMilestone({
					...event,
					status: nextStatus ?? event.status,
				});
				notifications += 1;
			} catch {
				// Notification failures must not abort the sweep.
			}
		}
	} finally {
		await db.$disconnect();
	}

	return { swept, statusChanges, notifications };
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startEventLifecycleWorker(): void {
	if (timer) return;

	const intervalMs = getIntervalMs();

	// First sweep shortly after boot so statuses are fresh, then on interval.
	setTimeout(() => {
		runLifecycleSweep().catch((error) => {
			console.error("[event-lifecycle] sweep failed:", error);
		});
	}, 10_000);

	timer = setInterval(() => {
		runLifecycleSweep().catch((error) => {
			console.error("[event-lifecycle] sweep failed:", error);
		});
	}, intervalMs);

	// Never keep the process alive just for the worker.
	timer.unref?.();
	console.log(
		`[event-lifecycle] worker started (interval: ${Math.round(intervalMs / 1000)}s)`,
	);
}

export function stopEventLifecycleWorker(): void {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
}

// Allow standalone execution: `tsx src/jobs/event-lifecycle.ts`
if (process.argv[1]?.includes("event-lifecycle")) {
	startEventLifecycleWorker();
}
