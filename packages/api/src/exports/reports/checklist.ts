import db from "@muxima/db";

import { getChecklistAnalytics } from "../../modules/checklist/analytics";
import type { ExportContext } from "../core/export-context";
import { formatNumber } from "../core/format";
import type { ReportDefinition } from "../core/report-definition";
import { CHECKLIST_COLUMNS, loadChecklistRows } from "./rows/checklist";

/**
 * Checklist report: every item, its link to a supplier/inventory item and the
 * overdue subset.
 */

export async function buildChecklistReport(
	eventId: string,
	context: ExportContext,
): Promise<ReportDefinition> {
	const now = context.generatedAt;

	const [analytics, rows] = await Promise.all([
		getChecklistAnalytics(db, eventId, now),
		loadChecklistRows(eventId, now),
	]);

	return {
		title: "Relatório de Checklist",
		subtitle: "Estado de preparação do evento, item a item",
		sections: [
			{
				kind: "kpis",
				title: "Resumo",
				items: [
					{ label: "Total de itens", value: formatNumber(analytics.total) },
					{ label: "Concluídos", value: formatNumber(analytics.completed) },
					{ label: "Pendentes", value: formatNumber(analytics.pending) },
					{ label: "Em progresso", value: formatNumber(analytics.inProgress) },
					{ label: "Atrasados", value: formatNumber(analytics.overdue) },
					{
						label: "Progresso",
						value: `${formatNumber(analytics.completionPercentage)}%`,
					},
					{
						label: "Geridos automaticamente",
						value: formatNumber(analytics.autoManaged),
					},
					{
						label: "Ligados a fornecedores",
						value: formatNumber(analytics.linkedToSupplier),
					},
				],
			},
			{
				kind: "table",
				title: "Itens do checklist",
				sheetName: "Checklist",
				columns: CHECKLIST_COLUMNS,
				rows,
				emptyMessage: "Nenhum item no checklist.",
			},
		],
	};
}
