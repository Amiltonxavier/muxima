import db from "@muxima/db";

import { getTaskAnalytics } from "../../modules/tasks/analytics";
import type { ExportContext } from "../core/export-context";
import { formatNumber } from "../core/format";
import type { ReportDefinition } from "../core/report-definition";
import {
	loadTaskRows,
	OVERDUE_TASK_COLUMNS,
	overdueTaskRows,
	TASK_CATEGORY_LABELS,
	TASK_COLUMNS,
	TASK_DISTRIBUTION_COLUMNS,
	taskDistributionRows,
	taskPriorityLabels,
} from "./rows/tasks";

/**
 * Tasks report: every task of the event, grouped views and the overdue list.
 *
 * The rows and the overdue subset come from `./rows/tasks`, which the aggregate
 * event report reads too — so the two documents can never disagree about which
 * tasks are late.
 */

export async function buildTasksReport(
	eventId: string,
	context: ExportContext,
): Promise<ReportDefinition> {
	const now = context.generatedAt;
	const [analytics, rows] = await Promise.all([
		getTaskAnalytics(db, eventId, now),
		loadTaskRows(eventId, now),
	]);

	return {
		title: "Relatório de Tarefas",
		subtitle: "Todas as tarefas do evento, com prioridade, estado e prazos",
		sections: [
			{
				kind: "kpis",
				title: "Resumo",
				items: [
					{ label: "Total de tarefas", value: formatNumber(analytics.total) },
					{ label: "Concluídas", value: formatNumber(analytics.completed) },
					{ label: "Em progresso", value: formatNumber(analytics.inProgress) },
					{ label: "Por fazer", value: formatNumber(analytics.todo) },
					{ label: "Atrasadas", value: formatNumber(analytics.overdue) },
					{
						label: "Progresso",
						value: `${formatNumber(analytics.completionRate)}%`,
					},
				],
			},
			{
				kind: "table",
				title: "Tarefas",
				sheetName: "Tarefas",
				columns: TASK_COLUMNS,
				rows,
				emptyMessage: "Nenhuma tarefa registada.",
			},
			{
				kind: "table",
				title: "Por categoria",
				sheetName: "Categorias",
				columns: TASK_DISTRIBUTION_COLUMNS,
				rows: taskDistributionRows(
					analytics.byCategory,
					TASK_CATEGORY_LABELS,
					analytics.total,
				),
				emptyMessage: "Sem tarefas por categoria.",
			},
			{
				kind: "table",
				title: "Por prioridade",
				sheetName: "Prioridades",
				columns: TASK_DISTRIBUTION_COLUMNS,
				rows: taskDistributionRows(
					analytics.byPriority,
					taskPriorityLabels,
					analytics.total,
				),
				emptyMessage: "Sem tarefas por prioridade.",
			},
			{
				kind: "table",
				title: "Atrasadas",
				sheetName: "Atrasadas",
				columns: OVERDUE_TASK_COLUMNS,
				rows: overdueTaskRows(rows, now),
				emptyMessage: "Nenhuma tarefa atrasada.",
			},
		],
	};
}
