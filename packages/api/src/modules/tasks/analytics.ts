import db from "@muxima/db";
import type { PrismaClient } from "@muxima/db/prisma";

/**
 * Task + schedule analytics.
 *
 * Moved out of the `tasks` router so the router, the event summary report and
 * the export layer share one aggregation. Overdue uses the same rule the whole
 * app uses: not done, and the due date is already in the past.
 */

export type TaskAnalytics = {
	total: number;
	todo: number;
	inProgress: number;
	completed: number;
	cancelled: number;
	overdue: number;
	completionRate: number;
	byCategory: Record<string, number>;
	byPriority: Record<string, number>;
	byStatus: Record<string, number>;
};

export type ScheduleAnalytics = {
	total: number;
	pending: number;
	inProgress: number;
	completed: number;
	cancelled: number;
	/** Sum of every activity duration that declares an end. In minutes. */
	totalDurationMinutes: number;
	firstStartAt: Date | null;
	lastEndAt: Date | null;
};

type Db = PrismaClient;

const TASK_STATUSES = [
	"TODO",
	"IN_PROGRESS",
	"COMPLETED",
	"CANCELLED",
] as const;
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function emptyBy<T extends string>(keys: readonly T[]): Record<T, number> {
	return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
}

export async function getTaskAnalytics(
	client: Db,
	eventId: string,
	now = new Date(),
): Promise<TaskAnalytics> {
	const [total, todo, inProgress, completed, cancelled, overdue, grouped] =
		await Promise.all([
			client.task.count({ where: { eventId } }),
			client.task.count({ where: { eventId, status: "TODO" } }),
			client.task.count({ where: { eventId, status: "IN_PROGRESS" } }),
			client.task.count({ where: { eventId, status: "COMPLETED" } }),
			client.task.count({ where: { eventId, status: "CANCELLED" } }),
			client.task.count({
				where: {
					eventId,
					status: { in: ["TODO", "IN_PROGRESS"] },
					dueDate: { lt: now },
				},
			}),
			client.task.groupBy({
				by: ["category", "priority", "status"],
				where: { eventId },
				_count: { _all: true },
			}),
		]);

	const byCategory: Record<string, number> = {};
	const byPriority = emptyBy(TASK_PRIORITIES);
	const byStatus = emptyBy(TASK_STATUSES);

	for (const row of grouped) {
		const count = row._count._all;
		byCategory[row.category] = (byCategory[row.category] ?? 0) + count;
		if (row.priority in byPriority) byPriority[row.priority] += count;
		if (row.status in byStatus) byStatus[row.status] += count;
	}

	return {
		total,
		todo,
		inProgress,
		completed,
		cancelled,
		overdue,
		completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
		byCategory,
		byPriority,
		byStatus,
	};
}

export async function getScheduleAnalytics(
	client: Db,
	eventId: string,
): Promise<ScheduleAnalytics> {
	const [total, pending, inProgress, completed, cancelled, rows] =
		await Promise.all([
			client.schedule.count({ where: { eventId } }),
			client.schedule.count({ where: { eventId, status: "PENDING" } }),
			client.schedule.count({ where: { eventId, status: "IN_PROGRESS" } }),
			client.schedule.count({ where: { eventId, status: "COMPLETED" } }),
			client.schedule.count({ where: { eventId, status: "CANCELLED" } }),
			client.schedule.findMany({
				where: { eventId },
				select: { startAt: true, endAt: true },
				orderBy: { startAt: "asc" },
			}),
		]);

	let totalDurationMinutes = 0;
	for (const row of rows) {
		if (!row.endAt) continue;
		const minutes = (row.endAt.getTime() - row.startAt.getTime()) / (1000 * 60);
		if (minutes > 0) totalDurationMinutes += minutes;
	}

	const first = rows[0] ?? null;
	const last = rows[rows.length - 1] ?? null;

	return {
		total,
		pending,
		inProgress,
		completed,
		cancelled,
		totalDurationMinutes: Math.round(totalDurationMinutes),
		firstStartAt: first?.startAt ?? null,
		lastEndAt: last?.endAt ?? last?.startAt ?? null,
	};
}

export const taskAnalytics = {
	getTasks: (eventId: string) => getTaskAnalytics(db, eventId),
	getSchedules: (eventId: string) => getScheduleAnalytics(db, eventId),
};
