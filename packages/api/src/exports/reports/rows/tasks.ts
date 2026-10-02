import db from "@muxima/db";

import type { ReportColumn, ReportRow } from "../../core/report-definition";
import {
	labelTaskCategory,
	labelTaskPriority,
	labelTaskStatus,
	TASK_PRIORITY_LABELS,
} from "../../core/report-labels";

/**
 * The task rows, in one place.
 *
 * The overdue marker lives in the row itself rather than in a renderer, so the
 * PDF, the spreadsheet and the "Atrasadas" table all agree on which tasks are
 * late — and they agree with `getTaskAnalytics`, which uses the same rule.
 */

export const TASK_COLUMNS: ReportColumn[] = [
	{ header: "Tarefa", key: "title", weight: 2.6 },
	{ header: "Categoria", key: "category", weight: 1.1 },
	{ header: "Prioridade", key: "priority", weight: 0.9 },
	{ header: "Estado", key: "status", weight: 1 },
	{ header: "Responsável", key: "assignee", weight: 1.4 },
	{ header: "Prazo", key: "dueDate", type: "date", weight: 1 },
	{ header: "Concluída em", key: "completedAt", type: "date", weight: 1 },
	{ header: "Descrição", key: "description", weight: 2.4 },
];

export const OVERDUE_TASK_COLUMNS: ReportColumn[] = [
	{ header: "Tarefa", key: "title", weight: 2.6 },
	{ header: "Prazo", key: "dueDate", type: "date", weight: 1 },
	{ header: "Responsável", key: "assignee", weight: 1.4 },
	{
		header: "Dias de atraso",
		key: "daysOverdue",
		type: "number",
		align: "right",
		weight: 1,
	},
];

export const TASK_DISTRIBUTION_COLUMNS: ReportColumn[] = [
	{ header: "Categoria", key: "label", weight: 1.6 },
	{
		header: "Total",
		key: "count",
		type: "number",
		align: "right",
		weight: 0.8,
	},
	{
		header: "%",
		key: "percentage",
		type: "percent",
		align: "right",
		weight: 0.8,
	},
];

export const TASK_CATEGORY_LABELS: Record<string, string> = {
	FINANCE: "Finanças",
	VENUE: "Espaço",
	GUESTS: "Convidados",
	FOOD: "Comida",
	DRINKS: "Bebidas",
	DECORATION: "Decoração",
	CEREMONY: "Cerimónia",
	DOCUMENTS: "Documentos",
	CLOTHING: "Roupa",
	TRANSPORT: "Transporte",
	OTHER: "Outro",
};

export async function loadTaskRows(
	eventId: string,
	now: Date,
): Promise<ReportRow[]> {
	const tasks = await db.task.findMany({
		where: { eventId },
		include: { assignee: { select: { name: true } } },
		orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
	});

	return tasks.map((task) => {
		const overdue =
			task.dueDate !== null &&
			task.dueDate < now &&
			task.status !== "COMPLETED" &&
			task.status !== "CANCELLED";

		return {
			title: task.title,
			category: labelTaskCategory(task.category),
			priority: overdue
				? `${labelTaskPriority(task.priority)} · em atraso`
				: labelTaskPriority(task.priority),
			status: labelTaskStatus(task.status),
			assignee: task.assignee?.name ?? "—",
			dueDate: task.dueDate,
			completedAt: task.completedAt,
			description: task.description ?? "—",
		};
	});
}

export function taskDistributionRows(
	counts: Record<string, number>,
	labels: Record<string, string>,
	total: number,
): ReportRow[] {
	return Object.entries(counts)
		.filter(([, count]) => count > 0)
		.sort((a, b) => b[1] - a[1])
		.map(([key, count]) => ({
			label: labels[key] ?? key,
			count,
			percentage: total > 0 ? Math.round((count / total) * 100) : 0,
		}));
}

/** The overdue subset, derived from the same rows so the two cannot diverge. */
export function overdueTaskRows(rows: ReportRow[], now: Date): ReportRow[] {
	return rows
		.filter((row) => String(row.priority ?? "").includes("em atraso"))
		.map((row) => ({
			title: row.title,
			dueDate: row.dueDate,
			assignee: row.assignee,
			daysOverdue:
				row.dueDate instanceof Date
					? Math.floor((now.getTime() - row.dueDate.getTime()) / 86_400_000)
					: 0,
		}));
}

export const taskPriorityLabels = TASK_PRIORITY_LABELS;
