import db from "@muxima/db";

import { getScheduleAnalytics } from "../../modules/tasks/analytics";
import type { ExportContext } from "../core/export-context";
import { formatDate, formatNumber, formatTime } from "../core/format";
import type {
	ReportColumn,
	ReportDefinition,
	ReportRow,
} from "../core/report-definition";
import { labelScheduleStatus } from "../core/report-labels";

/**
 * Schedule report: the full programme with durations and a temporal summary.
 */

const SCHEDULE_COLUMNS: ReportColumn[] = [
	{ header: "Início", key: "startAt", type: "datetime", weight: 1.3 },
	{ header: "Atividade", key: "title", weight: 2.4 },
	{ header: "Fim", key: "endAt", type: "datetime", weight: 1.3 },
	{ header: "Duração", key: "duration", weight: 0.9 },
	{ header: "Local", key: "location", weight: 1.4 },
	{ header: "Responsável", key: "responsible", weight: 1.4 },
	{ header: "Estado", key: "status", weight: 1 },
	{ header: "Descrição", key: "description", weight: 2.4 },
];

function durationLabel(minutes: number): string {
	if (minutes <= 0) return "—";
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	if (hours === 0) return `${rest} min`;
	if (rest === 0) return `${hours} h`;
	return `${hours} h ${rest} min`;
}

export async function buildScheduleReport(
	eventId: string,
	_context: ExportContext,
): Promise<ReportDefinition> {
	const [analytics, schedules] = await Promise.all([
		getScheduleAnalytics(db, eventId),
		db.schedule.findMany({
			where: { eventId },
			orderBy: { startAt: "asc" },
		}),
	]);

	const rows: ReportRow[] = schedules.map((schedule) => ({
		startAt: schedule.startAt,
		title: schedule.title,
		endAt: schedule.endAt,
		duration: schedule.endAt
			? durationLabel(
					Math.round(
						(schedule.endAt.getTime() - schedule.startAt.getTime()) / 60_000,
					),
				)
			: "—",
		location: schedule.location ?? "—",
		responsible: schedule.responsible ?? "—",
		status: labelScheduleStatus(schedule.status),
		description: schedule.description ?? "—",
	}));

	return {
		title: "Relatório de Programa",
		subtitle: "Cronograma completo do evento com durações e responsáveis",
		sections: [
			{
				kind: "kpis",
				title: "Resumo",
				items: [
					{ label: "Atividades", value: formatNumber(analytics.total) },
					{ label: "Concluídas", value: formatNumber(analytics.completed) },
					{ label: "Em curso", value: formatNumber(analytics.inProgress) },
					{ label: "Pendentes", value: formatNumber(analytics.pending) },
					{
						label: "Duração total",
						value: durationLabel(analytics.totalDurationMinutes),
					},
					{
						label: "Primeira atividade",
						value: formatTime(analytics.firstStartAt),
					},
					{ label: "Última atividade", value: formatTime(analytics.lastEndAt) },
					{
						label: "Data do programa",
						value: analytics.firstStartAt
							? formatDate(analytics.firstStartAt)
							: "—",
					},
				],
			},
			{
				kind: "table",
				title: "Programa do evento",
				sheetName: "Programa",
				columns: SCHEDULE_COLUMNS,
				rows,
				emptyMessage: "Nenhuma atividade agendada.",
			},
		],
	};
}
