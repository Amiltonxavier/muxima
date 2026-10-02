import db from "@muxima/db";

import { getFoodPlanAnalytics } from "../../modules/food-plan/analytics";
import type { ExportContext } from "../core/export-context";
import { formatNumber } from "../core/format";
import type { ReportDefinition, ReportRow } from "../core/report-definition";
import {
	FOOD_PLAN_CATEGORY_COLUMNS,
	FOOD_PLAN_ITEM_COLUMNS,
	loadFoodPlanRows,
} from "./rows/food-plan";

/**
 * Food plan report: the menu, quantities and completion per category.
 */

export async function buildFoodPlanReport(
	eventId: string,
	_context: ExportContext,
): Promise<ReportDefinition> {
	const [stats, plan, rows] = await Promise.all([
		getFoodPlanAnalytics(db, eventId),
		db.foodPlan.findUnique({
			where: { eventId },
			select: { notes: true },
		}),
		loadFoodPlanRows(eventId),
	]);

	const categoryRows: ReportRow[] = stats.byCategory.map((entry) => ({
		category: entry.label,
		count: entry.count,
		quantity: entry.totalQuantity,
		completed: entry.completed,
	}));

	return {
		title: "Relatório do Plano de Alimentação",
		subtitle: "Menu, quantidades e estado de preparação das refeições",
		sections: [
			{
				kind: "kpis",
				title: "Resumo",
				items: [
					{ label: "Itens no plano", value: formatNumber(stats.totalItems) },
					{ label: "Concluídos", value: formatNumber(stats.completedItems) },
					{ label: "Em progresso", value: formatNumber(stats.inProgressItems) },
					{ label: "Pendentes", value: formatNumber(stats.pendingItems) },
					{
						label: "Quantidade total",
						value: formatNumber(stats.totalQuantity),
					},
					{
						label: "Progresso",
						value: `${formatNumber(stats.completionPercentage)}%`,
					},
				],
			},
			{
				kind: "pairs",
				title: "Catering",
				items: [
					{
						label: "Fornecedor de alimentação",
						value: stats.supplierName ?? "Não atribuído",
					},
					{ label: "Notas do plano", value: plan?.notes ?? "—" },
				],
			},
			{
				kind: "table",
				title: "Itens do plano",
				sheetName: "Itens",
				columns: FOOD_PLAN_ITEM_COLUMNS,
				rows,
				emptyMessage: "Nenhum item no plano de alimentação.",
				totals: {
					label: "Total",
					values: { quantity: stats.totalQuantity },
				},
			},
			{
				kind: "table",
				title: "Por categoria",
				sheetName: "Categorias",
				columns: FOOD_PLAN_CATEGORY_COLUMNS,
				rows: categoryRows,
				emptyMessage: "Sem itens por categoria.",
			},
		],
	};
}
