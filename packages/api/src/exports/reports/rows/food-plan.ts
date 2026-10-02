import db from "@muxima/db";

import type { ReportColumn, ReportRow } from "../../core/report-definition";
import {
	labelFoodPlanCategory,
	labelFoodPlanStatus,
	labelFoodPlanUnit,
} from "../../core/report-labels";

/**
 * The food-plan rows, in one place.
 *
 * An event has at most one plan, so a missing plan is an empty row set rather
 * than an error — the report then shows the "empty" message instead of failing.
 */

export const FOOD_PLAN_ITEM_COLUMNS: ReportColumn[] = [
	{ header: "Prato", key: "name", weight: 2.6 },
	{ header: "Categoria", key: "category", weight: 1.3 },
	{
		header: "Quantidade",
		key: "quantity",
		type: "number",
		align: "right",
		weight: 0.9,
	},
	{ header: "Unidade", key: "unit", weight: 0.9 },
	{ header: "Estado", key: "status", weight: 1 },
	{ header: "Descrição", key: "description", weight: 2.2 },
	{ header: "Notas", key: "notes", weight: 1.8 },
];

export const FOOD_PLAN_CATEGORY_COLUMNS: ReportColumn[] = [
	{ header: "Categoria", key: "category", weight: 1.8 },
	{
		header: "Itens",
		key: "count",
		type: "number",
		align: "right",
		weight: 0.7,
	},
	{
		header: "Quantidade",
		key: "quantity",
		type: "number",
		align: "right",
		weight: 1,
	},
	{
		header: "Concluídos",
		key: "completed",
		type: "number",
		align: "right",
		weight: 0.9,
	},
];

export async function loadFoodPlanRows(eventId: string): Promise<ReportRow[]> {
	const plan = await db.foodPlan.findUnique({
		where: { eventId },
		include: {
			items: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
		},
	});

	return (plan?.items ?? []).map((item) => ({
		name: item.name,
		category: labelFoodPlanCategory(item.category),
		quantity: Number(item.quantity),
		unit: labelFoodPlanUnit(item.unit),
		status: labelFoodPlanStatus(item.status),
		description: item.description ?? "—",
		notes: item.notes ?? "—",
	}));
}
